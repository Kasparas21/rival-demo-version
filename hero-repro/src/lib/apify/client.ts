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

type ApifyDatasetItemsResponse<T> = {
  data?: {
    items?: T[];
  };
};

const APIFY_API_BASE = "https://api.apify.com/v2";

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
  runUrl.searchParams.set("waitForFinish", String(waitSecs));
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

  const runData = runPayload?.data;
  if (!runData?.id) {
    throw new ApifyRunnerError("Actor run did not return a run id");
  }

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

  const items = (await datasetResponse.json()) as T[];

  return {
    run: {
      id: runData.id,
      status: runData.status,
      defaultDatasetId: runData.defaultDatasetId,
    },
    items,
  };
}
