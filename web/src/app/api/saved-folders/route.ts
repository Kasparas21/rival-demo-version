import { NextResponse } from "next/server";
import { z } from "zod";

import { createSavedFolder, listSavedFolders } from "@/lib/saved-ads/saved-folders";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const postBodySchema = z.object({
  name: z.string().min(1).max(80),
});

export async function GET(): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { folders, error } = await listSavedFolders(supabase, user.id);
  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, folders });
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof postBodySchema>;
  try {
    body = postBodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const { folder, error } = await createSavedFolder(supabase, user.id, body.name);
  if (error || !folder) {
    const status = error === "folder already exists" ? 409 : 500;
    return NextResponse.json({ ok: false, error: error ?? "failed" }, { status });
  }

  return NextResponse.json({ ok: true, folder });
}
