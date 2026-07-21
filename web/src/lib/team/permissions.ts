import { NextResponse } from "next/server";

import type { WorkspaceContext } from "@/lib/team/workspace-context";

export class WorkspacePermissionError extends Error {
  readonly status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "WorkspacePermissionError";
    this.status = status;
  }
}

export function permissionDeniedResponse(err: unknown): NextResponse {
  const message =
    err instanceof WorkspacePermissionError
      ? err.message
      : err instanceof Error
        ? err.message
        : "Forbidden";
  const status = err instanceof WorkspacePermissionError ? err.status : 403;
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function assertCanMutate(ctx: WorkspaceContext): void {
  if (ctx.isGuest) {
    throw new WorkspacePermissionError(
      "Temporary link access is read-only. Create an account to make changes.",
    );
  }
  if (ctx.isViewer) {
    throw new WorkspacePermissionError("Read-only team viewer — this action is not allowed.");
  }
}

export function assertCanManageTeam(ctx: WorkspaceContext): void {
  if (ctx.isGuest) {
    throw new WorkspacePermissionError("Sign in to manage team members.");
  }
  assertCanMutate(ctx);
}

export function assertCanScrape(ctx: WorkspaceContext): void {
  assertCanMutate(ctx);
}

export function assertCanRunSharedAi(_ctx: WorkspaceContext): void {
  // Viewers may trigger shared AI analysis on the owner's workspace.
}
