export type ActorRun = {
  id: string;
  status?: string;
  defaultDatasetId?: string | null;
};

export class ApifyRunnerError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ApifyRunnerError";
  }
}

export type RunActorOptions = {
  /** Max seconds to wait for the run to finish (default 120) */
  waitSecs?: number;
  /** Memory in MB for the run (Apify `memoryMbytes` option) */
  memoryMbytes?: number;
  /** Actor run timeout in seconds (Apify `timeoutSecs` option) */
  timeoutSecs?: number;
  /**
   * Max dataset items you can be charged for (Apify `maxItems` query param).
   * Store actors that bill per dataset row require this to be > 0 or the run is rejected.
   */
  maxItems?: number;
};

type ApifyRunResponse = {
  data?: {
    id?: string;
    status?: string;
    defaultDatasetId?: string | null;
  };
};

const APIFY_API_BASE = "https://api.apify.com/v2";

/** Wall-clock wait budget after the run is created (avoids one long `waitForFinish` HTTP connection). */
const RUN_POLL_INTERVAL_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTerminalApifyRunStatus(status: string | undefined): boolean {
  const s = normalizeApifyRunStatus(status);
  return s === "SUCCEEDED" || s === "FAILED" || s === "ABORTED" || s === "TIMED-OUT";
}

async function fetchActorRunSnapshot(runId: string, token: string): Promise<NonNullable<ApifyRunResponse["data"]>> {
  const url = new URL(`${APIFY_API_BASE}/actor-runs/${encodeURIComponent(runId)}`);
  url.searchParams.set("token", token);
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (error) {
    throw new ApifyRunnerError(
      `Apify run status fetch failed before completion: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error
    );
  }
  const payload = await parseJson<ApifyRunResponse>(res);
  if (!res.ok) {
    throw new ApifyRunnerError(
      `Apify run status fetch failed: ${payload ? JSON.stringify(payload) : `${res.status} ${res.statusText}`}`
    );
  }
  const data = payload?.data;
  if (!data?.id) {
    throw new ApifyRunnerError("Apify run status response did not include a run id");
  }
  return data as NonNullable<ApifyRunResponse["data"]>;
}

async function resolveRunToTerminal(
  runId: string,
  token: string,
  initial: NonNullable<ApifyRunResponse["data"]>,
  waitSecs: number
): Promise<NonNullable<ApifyRunResponse["data"]>> {
  const deadline = Date.now() + Math.max(1, waitSecs) * 1000;
  let current: NonNullable<ApifyRunResponse["data"]> = { ...initial, id: initial.id };

  while (!isTerminalApifyRunStatus(current.status)) {
    if (Date.now() >= deadline) {
      throw new ApifyRunnerError(
        `Apify actor run ${runId} did not finish within ${waitSecs}s (last status: ${current.status ?? "unknown"})`
      );
    }
    await sleep(RUN_POLL_INTERVAL_MS);
    const next = await fetchActorRunSnapshot(runId, token);
    current = {
      id: next.id,
      status: next.status ?? current.status,
      defaultDatasetId: next.defaultDatasetId ?? current.defaultDatasetId,
    };
  }

  return current;
}

function normalizeApifyRunStatus(status: string | undefined): string {
  return status?.trim().toUpperCase() ?? "";
}

/**
 * FAILED runs are unusable; abort before hitting the dataset.
 */
function assertApifyRunNotFailed(runId: string, status: string | undefined): void {
  const s = normalizeApifyRunStatus(status);
  if (s === "FAILED") {
    throw new ApifyRunnerError(
      `Apify actor run ${runId} has status FAILED. See the run log in the Apify console for details.`
    );
  }
  if (s === "TIMED-OUT") {
    throw new ApifyRunnerError(
      `Apify actor run ${runId} has status TIMED-OUT (exceeded the actor run timeout).`
    );
  }
}

/**
 * Apify can mark a run ABORTED while the actor still finishes during graceful shutdown and writes rows.
 * If the dataset is empty, surface an error; otherwise return items so the product works despite ABORTED status.
 */
function assertAbortedRunHasDatasetRows(runId: string, status: string | undefined, itemCount: number): void {
  if (normalizeApifyRunStatus(status) !== "ABORTED") return;
  if (itemCount > 0) return;
  throw new ApifyRunnerError(
    `Apify actor run ${runId} has status ABORTED with no dataset rows. ` +
      `That status is set on Apify's side (UI stop, API abort, or platform behavior — this app does not call Apify's abort API). ` +
      `Inspect the run in Apify or retry; if rows exist in the console, the actor may have been interrupted before export.`
  );
}

function parseApifyDatasetItems<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items as T[];
    if (Array.isArray(o.data)) return o.data as T[];
  }
  return [];
}

/**
 * Crawlee / Apify dataset rows frequently wrap the crawler record under `json`.
 * Merge once so downstream normalizers see advertiser/headline at the top level.
 */
export function flattenApifyDatasetRecord(row: Record<string, unknown>): Record<string, unknown> {
  const nested = row.json;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const inner = nested as Record<string, unknown>;
    const { json: _omit, ...rest } = row;
    return { ...inner, ...rest };
  }
  return row;
}

function requireApifyToken(): string {
  const token = process.env.APIFY_TOKEN?.trim();
  if (!token) {
    throw new ApifyRunnerError("APIFY_TOKEN is not configured");
  }
  return token;
}

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Run an Apify actor through the REST API and return all dataset items.
 * This avoids runtime issues from the SDK in Next.js dev/server bundles.
 *
 * Waits by **polling** run status instead of holding one long `waitForFinish` request, so a dropped browser
 * or serverless connection to *our* API does not correlate with Apify cancelling the wait stream (which can
 * show up as an "aborted" run in logs).
 *
 * If Apify returns ABORTED but the default dataset has rows (graceful shutdown), those rows are still returned.
 */
export async function runApifyActor<T = Record<string, unknown>>(
  actorId: string,
  input: Record<string, unknown>,
  options?: RunActorOptions
): Promise<{ run: ActorRun; items: T[] }> {
  const token = requireApifyToken();
  const waitSecs = options?.waitSecs ?? 120;

  const runUrl = new URL(`${APIFY_API_BASE}/acts/${encodeURIComponent(actorId)}/runs`);
  runUrl.searchParams.set("token", token);
  if (options?.memoryMbytes) {
    runUrl.searchParams.set("memory", String(options.memoryMbytes));
  }
  if (options?.timeoutSecs) {
    runUrl.searchParams.set("timeout", String(options.timeoutSecs));
  }
  if (options?.maxItems != null && options.maxItems > 0) {
    runUrl.searchParams.set("maxItems", String(Math.floor(options.maxItems)));
  }

  let runResponse: Response;
  try {
    runResponse = await fetch(runUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch (error) {
    throw new ApifyRunnerError(
      `Apify actor failed before the request completed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error
    );
  }

  const runPayload = await parseJson<ApifyRunResponse>(runResponse);
  if (!runResponse.ok) {
    throw new ApifyRunnerError(
      `Apify actor failed: ${runPayload ? JSON.stringify(runPayload) : `${runResponse.status} ${runResponse.statusText}`}`
    );
  }

  let runData = runPayload?.data;
  if (!runData?.id) {
    throw new ApifyRunnerError("Actor run did not return a run id");
  }

  const runId = runData.id;
  runData = await resolveRunToTerminal(runId, token, runData, waitSecs);

  assertApifyRunNotFailed(runId, runData.status);

  if (!runData.defaultDatasetId) {
    throw new ApifyRunnerError("Actor run finished without a default dataset");
  }

  const datasetUrl = new URL(`${APIFY_API_BASE}/datasets/${runData.defaultDatasetId}/items`);
  datasetUrl.searchParams.set("token", token);
  datasetUrl.searchParams.set("clean", "true");
  datasetUrl.searchParams.set("limit", "10000");
  datasetUrl.searchParams.set("format", "json");

  let datasetResponse: Response;
  try {
    datasetResponse = await fetch(datasetUrl, {
      method: "GET",
      cache: "no-store",
    });
  } catch (error) {
    throw new ApifyRunnerError(
      `Apify dataset fetch failed before completion: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error
    );
  }

  if (!datasetResponse.ok) {
    const datasetPayload = await datasetResponse.text();
    throw new ApifyRunnerError(
      `Apify dataset fetch failed: ${datasetResponse.status} ${datasetResponse.statusText}${datasetPayload ? ` - ${datasetPayload}` : ""}`
    );
  }

  /** Apify datasets are usually a JSON array; some exporters / proxies may wrap arrays. */
  const rawPayload = (await datasetResponse.json()) as unknown;
  const items = parseApifyDatasetItems<T>(rawPayload);

  assertAbortedRunHasDatasetRows(runId, runData.status, items.length);

  return {
    run: {
      id: runId,
      status: runData.status,
      defaultDatasetId: runData.defaultDatasetId,
    },
    items,
  };
}
