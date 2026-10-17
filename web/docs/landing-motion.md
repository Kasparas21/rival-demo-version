# Landing page motion

Reference: https://www.agenzy.lt/, inspected 6 October 2026 using the live page and its public Framer animation configuration. Rival retains its own branding, content, illustrations, and destinations.

| Motion | Reference settings | Rival implementation |
| --- | --- | --- |
| Intro logo | 560px rise, 360° rotation; 2.1s; cubic-bezier(.56,.22,.05,.99) | Rival logo on a frosted pastel curtain (onboarding branding) |
| Intro exit | Begins at 1.5s, 900ms; cubic-bezier(.96,-.02,.38,1.01); removed at 3s | Curtain retracts upwards and logo exits upwards |
| Hero entrance | 170px rise; icons at 2s, title/image at 2.1s, paragraph at 2.2s, CTA at 2.3s | Same phases |
| Hero words | Blur 10px, y 10px; 50ms word stagger | Same treatment, preserving line breaks and italic emphasis |
| Entrance spring | Stiffness 121, damping 27, mass .3 | Same Framer Motion spring |
| Section entrance | 80px rise, 100ms stagger; headings enter at viewport edge, cards at 50% visibility | Individual headings, descriptions, cards, steps, FAQ rows; tall blocks use a reachable threshold |
| Split layouts | ±80px horizontal entrance | Alternating illustration and comparison entrances |
| Hero media | Replaced with real ad examples | Two continuous vertical ad tracks on desktop; a compact horizontal track on mobile. |
| Card illustrations | 7px, 3s / 3.4s / 3.8s each direction | Independent illustration loops |
| Tickers | Icons 10px/s, logos 25px/s | Seamless duplicated tracks; ResizeObserver preserves speed at responsive widths |
| Smooth scroll | Lenis duration 1s | Page-scoped Lenis, native touch, CSS anchor offsets |
| Button hover | 500ms spring; incoming text above, outgoing below, 5px blur | Updated CTA treatment: stable label, 280ms lift and pearl arrow rotation, 800ms reflective sweep; 100ms pressed state. Reduced motion disables movement and the sweep. |
| Cursor | Small circular desktop pointer | Native browser cursor |

The reference's visual media differs from Rival's CSS illustrations, and its full-site route wipes are not applied to Rival's application routes. This is a landing-page motion adaptation, not a copy of the reference's proprietary assets or complete Framer runtime.

## Behavior and lifecycle

- Scroll reveals run once; hovering/scrolling back does not replay them.
- Loops pause offscreen; motion follows the system reduced-motion preference.
- Reduced-motion preferences remove intro, entrance, floating, and ticker motion.
- Intro is skipped for deep links/restored scroll positions and ends immediately on keyboard focus or scrolling.
- Server-rendered content remains available without JavaScript through the noscript fallback.
- Contact dialogs stop smooth scrolling and retain their existing native scroll lock.
- All observers, animation controls, event listeners, timers, and Lenis instances clean up on unmount.

## Validation

Targeted ESLint passes. TypeScript reports only the same 10 existing errors in unrelated test files; the landing components add no type errors. Browser validation covers fresh hydration, desktop and mobile layouts, once-only viewport reveals, anchors, and contact-dialog scroll locking.

## Onboarding branding update

The landing page now reuses the exact `/smooth_animation_for_202603181849.mp4` asset, `/landing/hero-video-poster.webp` fallback, and `RivalVideoBackdropOverlays` from the onboarding shell. The 8-second muted inline video loops in one fixed background across the entire page, including mobile. It fades in over the poster when playback starts.

The palette uses onboarding's `#f2f4f8` base, sky `#DDF1FD`, mint/lime `#E9F1B5`, lavender `#F3E3FF`, and navy `#111827` text and controls. Translucent white surfaces, white borders, soft blue shadows, and 28px rounded panels replace the former beige/brown surfaces. The entrance curtain also uses this palette.

Reduced-motion preferences and background-tab visibility pause video playback; autoplay failure leaves the matching poster visible. Only one small video asset is decoded, with no separate videos per section. Shared onboarding components and behavior remain unchanged.

## Hero ad carousel

The fictional workspace is replaced by six actual ad creatives from Nike, Gymshark, and adidas. Four were downloaded from their official advertiser listings in Meta Ad Library on 6 October 2026. The two adidas creatives use the project's existing raw scraped Meta/Google archive. `public/landing/ads/sources.json` retains ad IDs, public source links where available, and archive provenance. These are captured ad examples, not a live feed or an endorsement. No artificial metrics or active-status badges are shown.

Desktop tracks move in opposite directions over 48s and 43s, using exactly duplicated groups for seamless wraparound. At 600px and below, all six ads share a 294px-high horizontal carousel. Images retain their proportions and are contained without cropping ad copy. The locally optimized WebP assets total approximately 113KB, including brand logos, and need no third-party requests.

Hover, keyboard focus, and pressing pause the animation. Clicking/tapping toggles a persistent pause without adding a separate visible control. Loops inherit offscreen pausing. Reduced motion removes animation and exposes native scrolling through the original cards, with duplicate groups hidden.
