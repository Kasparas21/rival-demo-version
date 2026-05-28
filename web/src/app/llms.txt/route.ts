export const dynamic = "force-static";

export function GET() {
  const body = `# Spy Rival
> AI competitor ad intelligence across Meta, Google, TikTok, LinkedIn, Pinterest, Snapchat.

## Key URLs
- Homepage: https://www.spy-rival.com/
- Pricing & plans: https://www.spy-rival.com/#pricing
- How it works: https://www.spy-rival.com/#how-it-works
- Blog: https://www.spy-rival.com/blog
- About: https://www.spy-rival.com/about
- Contact: hello@spy-rival.com

## Pricing
- Starter: EUR 79/month — 5 competitors, all 6 platforms, 1 seat
- Pro: EUR 149/month — 15 competitors, 2 seats
- 7-day free trial, 30-day money-back guarantee
`;

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
