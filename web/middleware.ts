import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/auth/callback",
    "/auth/:path*",
    "/onboarding",
    "/choose-plan",
    "/dashboard",
    "/dashboard/:path*",
    "/api/account/:path*",
  ],
};
