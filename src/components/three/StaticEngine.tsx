/**
 * Lightweight 2D stand-in for the 3D engine: shown for reduced-motion visitors,
 * while the canvas is not mounted yet, and when WebGL is unavailable.
 */
export default function StaticEngine({ className }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none ${className ?? ""}`}>
      <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="se-core" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ffe3cf" stopOpacity="1" />
            <stop offset="0.35" stopColor="#ffc4a0" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffc4a0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="se-in" x1="0" x2="1">
            <stop offset="0" stopColor="#d4a373" stopOpacity="0" />
            <stop offset="1" stopColor="#ffc4a0" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="se-out" x1="0" x2="1">
            <stop offset="0" stopColor="#ffc4a0" stopOpacity="0.9" />
            <stop offset="1" stopColor="#bfe0c2" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="se-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d4a373" />
            <stop offset="1" stopColor="#e6a4b8" />
          </linearGradient>
        </defs>
        <g transform="translate(760 360)">
          <circle r="190" fill="url(#se-core)" />
          {[210, 165, 125, 90].map((r, i) => (
            <ellipse key={r} rx={r * 0.46} ry={r} fill="none" stroke="url(#se-ring)" strokeWidth={5 - i} opacity={0.85 - i * 0.12} />
          ))}
          <circle r="34" fill="#ffe3cf" />
          {[-90, -52, -18, 18, 52, 90].map((y) => (
            <rect key={y} x={-760} y={y * 0.5 - 1.5} width={640} height="3" rx="1.5" fill="url(#se-in)" opacity="0.65" />
          ))}
          {[-34, 0, 34].map((y) => (
            <rect key={y} x={110} y={y - 1.5} width={420} height="3" rx="1.5" fill="url(#se-out)" opacity="0.85" />
          ))}
          {[260, 380, 500].map((x, i) => (
            <g key={x} transform={`translate(${x} ${(i - 1) * 40 - 22})`} opacity={1 - i * 0.25}>
              <rect width="46" height="44" rx="9" fill="#2a1c13" stroke="#bfe0c2" strokeWidth="3" />
              <rect width="46" height="13" rx="6" fill="#ffc4a0" />
              <path d="M13 28l7 7 13-14" fill="none" stroke="#a8d5ba" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
