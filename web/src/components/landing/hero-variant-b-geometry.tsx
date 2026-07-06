/** Soft white outline geometry - stroke-only, diagonal/vertical lines (Madgicx-inspired). */
export function HeroVariantBGeometry() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[min(62%,560px)] w-full max-w-[76rem] sm:h-[min(58%,520px)] md:h-[min(54%,500px)]"
    >
      <svg
        className="absolute left-1/2 top-0 h-[120%] w-[min(106vw,80rem)] -translate-x-1/2 -translate-y-[14%] sm:-translate-y-[16%] md:-translate-y-[18%]"
        viewBox="0 0 1200 840"
        fill="none"
        preserveAspectRatio="xMidYMin meet"
      >
        <defs>
          <linearGradient id="hero-vb-edge-fade" x1="600" y1="0" x2="600" y2="840" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
            <stop offset="38%" stopColor="rgba(255,255,255,0.28)" />
            <stop offset="72%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient id="hero-vb-ray-l" x1="0%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient id="hero-vb-ray-r" x1="100%" y1="0%" x2="30%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <filter id="hero-vb-line-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="hero-vb-line-glow-soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform="translate(600 100) scale(1.28) translate(-600 -100)">
          {/* Corner rays */}
          <path d="M 0 24 L 468 800" stroke="url(#hero-vb-ray-l)" strokeWidth="0.55" opacity="0.45" filter="url(#hero-vb-line-glow-soft)" />
          <path d="M 1200 24 L 732 800" stroke="url(#hero-vb-ray-r)" strokeWidth="0.55" opacity="0.45" filter="url(#hero-vb-line-glow-soft)" />

          {/* Frame legs - diagonals only, no horizontals */}
          <path
            d="M 168 96 L 312 760"
            stroke="url(#hero-vb-edge-fade)"
            strokeWidth="0.7"
            filter="url(#hero-vb-line-glow)"
            opacity="0.38"
          />
          <path
            d="M 1032 96 L 888 760"
            stroke="url(#hero-vb-edge-fade)"
            strokeWidth="0.7"
            filter="url(#hero-vb-line-glow)"
            opacity="0.38"
          />
          <path
            d="M 252 148 L 368 708"
            stroke="url(#hero-vb-edge-fade)"
            strokeWidth="0.6"
            filter="url(#hero-vb-line-glow-soft)"
            opacity="0.24"
          />
          <path
            d="M 948 148 L 832 708"
            stroke="url(#hero-vb-edge-fade)"
            strokeWidth="0.6"
            filter="url(#hero-vb-line-glow-soft)"
            opacity="0.24"
          />
          <path
            d="M 328 196 L 416 664"
            stroke="url(#hero-vb-edge-fade)"
            strokeWidth="0.5"
            opacity="0.14"
          />
          <path
            d="M 872 196 L 784 664"
            stroke="url(#hero-vb-edge-fade)"
            strokeWidth="0.5"
            opacity="0.14"
          />

          {/* Center V - vertical + diagonals */}
          <path
            d="M 600 88 L 600 248"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="0.5"
            filter="url(#hero-vb-line-glow-soft)"
            opacity="0.32"
          />
          <path
            d="M 600 88 L 468 760"
            stroke="url(#hero-vb-edge-fade)"
            strokeWidth="0.55"
            opacity="0.16"
          />
          <path
            d="M 600 88 L 732 760"
            stroke="url(#hero-vb-edge-fade)"
            strokeWidth="0.55"
            opacity="0.16"
          />
        </g>
      </svg>

      <div className="absolute left-1/2 top-0 h-56 w-[min(88vw,40rem)] -translate-x-1/2 -translate-y-[10%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.38),transparent_68%)]" />
    </div>
  );
}
