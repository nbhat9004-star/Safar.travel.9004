'use client';

/**
 * SafarCompassIcon
 * ------------------------------------------------------------------
 * Premium custom-drawn compass that replaces the hamburger menu icon.
 * - Idle: subtle needle sway (respects prefers-reduced-motion)
 * - Hover: gentle whole-compass rotation
 * - Active/tap: quick counter-rotate + scale
 * - Open: smoothly morphs into a close (X) icon
 *
 * Pure SVG + CSS (see .safar-compass rules in /app/app/circle/circle.css).
 * No JS animation loop, no external libs.
 */
export default function SafarCompassIcon({ open = false, size = 18, className = '' }) {
  return (
    <svg
      className={`safar-compass ${open ? 'is-open' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="sc-needle-n" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0abfc" />
          <stop offset="55%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6ee7b7" />
        </linearGradient>
        <radialGradient id="sc-hub" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.35" />
        </radialGradient>
      </defs>

      {/* Compass housing ring */}
      <circle
        className="sc-ring"
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeOpacity="0.9"
      />

      {/* Inner ring (subtle) */}
      <circle
        className="sc-ring sc-ring-inner"
        cx="12"
        cy="12"
        r="6.4"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeOpacity="0.32"
        strokeDasharray="1 2.2"
      />

      {/* Cardinal ticks */}
      <g
        className="sc-ticks"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeOpacity="0.85"
      >
        <line x1="12" y1="1.9" x2="12" y2="3.6" />
        <line x1="22.1" y1="12" x2="20.4" y2="12" />
        <line x1="12" y1="22.1" x2="12" y2="20.4" />
        <line x1="1.9" y1="12" x2="3.6" y2="12" />
      </g>

      {/* Rotating needle (N gradient, S ghosted) */}
      <g className="sc-needle">
        <path
          className="sc-needle-n"
          d="M12 4.6 L13.7 12 L12 13.4 L10.3 12 Z"
          fill="url(#sc-needle-n)"
        />
        <path
          className="sc-needle-s"
          d="M12 19.4 L10.3 12 L12 10.6 L13.7 12 Z"
          fill="currentColor"
          fillOpacity="0.35"
        />
        <circle cx="12" cy="12" r="1.35" fill="url(#sc-hub)" />
      </g>

      {/* Close (X) strokes — hidden until .is-open */}
      <g
        className="sc-x"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      >
        <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" />
        <line x1="17.5" y1="6.5" x2="6.5" y2="17.5" />
      </g>
    </svg>
  );
}
