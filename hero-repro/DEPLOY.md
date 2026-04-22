# Vercel deployment (hero-repro)

Use this as a checklist when deploying the Next.js app in this directory.

## Repository and Vercel

- Push the app to a GitHub repository (or connect your existing monorepo).
- In [Vercel](https://vercel.com), create a project and import the repo.
- **Root Directory:** set to `hero-repro` (or the path of this app if your monorepo layout differs). Vercel should run install and build from that folder.
- **Framework Preset:** Next.js (default when `package.json` is detected in the root directory).
- **Build / Output:** use the default Next.js build unless you have a custom `vercel.json`.

## Environment variables (Vercel → Project → Settings → Environment variables)

Set these for **Production** (and **Preview** if you use preview deploys). Names match `src/lib/supabase/env.ts` and app usage.


| Name                                   | Description                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL (e.g. `https://xxxxx.supabase.co`).                                                                 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon / publishable key.                                                                                         |
| `SUPABASE_SECRET_KEY`                  | Server-only secret (service role or secret key) used by server routes. Do **not** expose in client code.                 |
| `NEXT_PUBLIC_GOOGLE_AD_DETAILS`        | Optional. Set to `true` for richer Google ad details (slower, more Apify usage). Omit or set to `false` for the default. |


No hardcoded keys in the repo: copy values from the [Supabase](https://supabase.com/dashboard) project settings and your secrets manager.

## Supabase: URLs and auth redirects

- In Supabase: **Project Settings → API** — copy **Project URL** and **anon** key into the `NEXT_PUBLIC_`* variables.
- In Supabase: **Authentication → URL Configuration** — set:
  - **Site URL** to your Vercel production URL (e.g. `https://your-app.vercel.app`).
  - **Redirect URLs** to include the same origin, preview URLs, and the OAuth email route handler:
    - `https://your-app.vercel.app/auth/callback` (see `src/app/auth/callback/route.ts`).
- If OAuth providers are enabled, add the same callback URLs in each provider’s console (Google, etc.) as required.

## Public demo

- **Dashboard routes are public in middleware:** unauthenticated users can open `/dashboard` and sub-routes. Session refresh for logged-in users still applies on paths covered by the middleware matcher (e.g. `/login`, `/api/account/`*). **Account** behavior is enforced in API route handlers, not by blocking the dashboard in middleware.

## After deploy

- Open the production URL, load `/dashboard`, and confirm the demo and banner behave as expected.
- Sign in and confirm account-backed features and `/api/account` still work.
- Check Vercel build logs and runtime logs for missing env or Supabase errors.