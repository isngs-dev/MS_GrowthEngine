/** Flat 2D step icons: shown when the 3D icons are unavailable (reduced motion, no WebGL, still loading). */
export default function StepIcon({ index, className }: { index: number; className?: string }) {
  const id = `si-g-${index}`;
  const stroke = { stroke: `url(#${id})`, strokeWidth: 3, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e8c39e" />
          <stop offset="0.55" stopColor="#ffc4a0" />
          <stop offset="1" stopColor="#f0b8c8" />
        </linearGradient>
      </defs>
      {index === 0 && (
        <g {...stroke}>
          <rect x="12" y="8" width="30" height="40" rx="4" />
          <path d="M19 18h16M19 26h12M19 34h8" />
          <circle cx="42" cy="40" r="9" />
          <path d="M49 47l8 8" />
        </g>
      )}
      {index === 1 && (
        <g {...stroke}>
          <circle cx="32" cy="32" r="22" />
          <circle cx="32" cy="32" r="14" />
          <circle cx="32" cy="29" r="4" />
          <path d="M24 42c1-5 15-5 16 0" />
        </g>
      )}
      {index === 2 && (
        <g {...stroke}>
          <rect x="8" y="14" width="22" height="32" rx="4" transform="rotate(-8 19 30)" />
          <rect x="22" y="12" width="22" height="34" rx="4" />
          <path d="M30 24l8 5-8 5z" />
          <rect x="38" y="20" width="18" height="30" rx="4" transform="rotate(8 47 35)" />
        </g>
      )}
      {index === 3 && (
        <g {...stroke}>
          <rect x="8" y="12" width="48" height="40" rx="5" />
          <path d="M8 22h48" />
          <circle cx="15" cy="17" r="1" />
          <path d="M16 30h32v8H16zM16 44h14M36 44h12" />
        </g>
      )}
      {index === 4 && (
        <g {...stroke}>
          <circle cx="32" cy="32" r="18" />
          <path d="M25 28v4M39 28v4" />
          <path d="M25 38c4 4 10 4 14 0" />
          <path d="M32 14V8M50 32h6M8 32h6" />
        </g>
      )}
      {index === 5 && (
        <g {...stroke}>
          <path d="M8 12h48L38 34v16l-12 4V34z" />
          <circle cx="20" cy="6" r="1.5" />
          <circle cx="44" cy="6" r="1.5" />
        </g>
      )}
      {index === 6 && (
        <g {...stroke}>
          <rect x="8" y="12" width="48" height="42" rx="5" />
          <path d="M8 24h48M20 8v8M44 8v8" />
          <path d="M24 38l6 6 12-12" />
        </g>
      )}
      {index === 7 && (
        <g {...stroke}>
          <rect x="22" y="12" width="36" height="40" rx="5" />
          <path d="M30 42v-8M38 42V28M46 42V22" />
          <path d="M4 32h12M12 28l4 4-4 4" />
        </g>
      )}
    </svg>
  );
}
