<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Rival Next.js App Router project. PostHog was already partially installed (posthog-js and posthog-node were present, along with a provider, pageview tracker, and server client). This integration extends that foundation with:

- **User identification**: A new `PostHogIdentify` client component listens to Supabase auth state changes and calls `posthog.identify(user.id, { email })` on sign-in and `posthog.reset()` on sign-out. It is mounted inside the existing `SitePostHogProvider` in the root layout so it only runs when marketing consent has been granted.
- **9 tracked events** across 9 files — 7 server-side (using the existing `getPostHogServerClient()`) and 2 client-side (using `posthog.capture()` directly).
- **Environment variables** `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` written to `.env.local`.

| Event | Description | File |
|---|---|---|
| `user_signed_up` | Fires server-side after a new user's confirmation email is sent successfully | `src/app/api/auth/sign-up-email/route.ts` |
| `checkout_created` | Fires server-side when a Polar checkout session is created | `src/app/api/billing/checkout/route.ts` |
| `subscription_activated` | Fires server-side on every Polar webhook subscription upsert | `src/app/api/billing/webhook/route.ts` |
| `ad_saved` | Fires server-side when a new ad is saved to the library (non-duplicate) | `src/app/api/saved-ads/route.ts` |
| `csv_exported` | Fires server-side after a competitor ad CSV is generated | `src/app/api/exports/csv/route.ts` |
| `competitor_follow_toggled` | Fires server-side when a competitor's spy-follow state is toggled | `src/app/api/account/saved-competitors/[id]/follow/route.ts` |
| `account_deleted` | Fires server-side before a user's account and billing data are deleted | `src/app/api/account/delete/route.ts` |
| `competitor_search_submitted` | Fires client-side when the spy search form is submitted with channel selection | `src/app/dashboard/spy/page.tsx` |
| `checkout_completed` | Fires client-side when the checkout success page confirms subscription sync | `src/app/checkout/success/checkout-success-client.tsx` |

## Next steps

We've built a dashboard and five insights to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](https://eu.posthog.com/project/193263/dashboard/723256)
- [New signups (last 30 days)](https://eu.posthog.com/project/193263/insights/f2IV59DA) — daily signup trend
- [Signup → checkout → subscription funnel](https://eu.posthog.com/project/193263/insights/oC8jqbHZ) — 4-step paid conversion funnel
- [Feature engagement (last 30 days)](https://eu.posthog.com/project/193263/insights/3Jqca81q) — competitor searches, ads saved, CSV exports
- [Subscription activations (last 30 days)](https://eu.posthog.com/project/193263/insights/IRvt7THa) — paid conversion momentum
- [Account deletions (churn signal)](https://eu.posthog.com/project/193263/insights/Y1IYVWKN) — weekly voluntary churn

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
