import { NextResponse } from "next/server";
import { ApifyRunnerError, runApifyActor } from "@/lib/apify/client";

export const runtime = "nodejs";
export const maxDuration = 300;

type Body = {
  actorId: string;
  input?: Record<string, unknown>;
  waitSecs?: number;
  memoryMbytes?: number;
  /** Cap charged dataset items (Apify); required for many store Actors */
  maxItems?: number;
};

/**
 * POST /api/apify/run
 * Body: { actorId, input?, waitSecs?, memoryMbytes?, maxItems? }
 *
 * Security: this uses your Apify credits. Protect this route (auth) before production,
 * or call `runApifyActor` only from other server code with a fixed allowlist of actors.
 */
export async function POST(req: Request) {
  try {
    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }
    const actorId = body.actorId?.trim();
    if (!actorId) {
      return NextResponse.json({ ok: false, error: "`actorId` is required" }, { status: 400 });
    }
    const maxItems = body.maxItems ?? 1000;
    const { run, items } = await runApifyActor(actorId, body.input ?? {}, {
      waitSecs: body.waitSecs,
      memoryMbytes: body.memoryMbytes,
      maxItems: maxItems > 0 ? maxItems : 1000,
    });
    return NextResponse.json({
      ok: true,
      run: {
        id: run.id,
        status: run.status,
        defaultDatasetId: run.defaultDatasetId,
      },
      itemCount: items.length,
      items,
    });
  } catch (e) {
    if (e instanceof ApifyRunnerError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
    }
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
