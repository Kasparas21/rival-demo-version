import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { ok: false, error: "Export is not implemented yet. Use screenshot or follow up in a later release." },
    { status: 501 }
  );
}
