# MS Growth Engine: landing page

Single-page marketing site for **MS Growth Engine by iSN Business Solutions**.
Next.js (App Router) + TypeScript + Tailwind v4, three.js via `@react-three/fiber` / `drei` / `postprocessing`,
GSAP + ScrollTrigger, Framer Motion, Lenis.

```bash
npm install
npm run dev      # http://localhost:3109
npm run build && npm run start
npm run typecheck && npm run lint
```

## Where things live

| What | File |
| --- | --- |
| All copy (verbatim from the brief) | `src/content/copy.ts` |
| Sections 1-5 | `src/components/sections/` (`Hero`, `Statement`, `Journey`, `About`, `Contact`, `Footer`) |
| 3D scenes (code-split, lazy mounted) | `src/components/three/` (`HeroScene`, `NodesScene`, `JourneyScene`, `AboutScene`, `ClosingScene`, `FormScene`) |
| Shared scroll-to-3D state | `src/components/three/progress.ts` |
| Quality tiers (static / low / medium / high) | `src/lib/quality.ts` |

## Connecting the form

The form posts to `src/app/api/lead/route.ts`, a **placeholder** that validates and acknowledges.
To go live, either:

- set `LEAD_WEBHOOK_URL` in `.env.local` (see `.env.example`): every valid lead is forwarded there as JSON, or
- implement the TODO in the route (CRM / email), or
- swap the fetch in `src/lib/submitLead.ts` for a call to your own backend.

## Performance and accessibility

- Canvases mount only near the viewport and stop rendering off-screen; pixel ratio is capped and adapts (`PerformanceMonitor`).
- Phones and weak devices get the "low" tier (fewer particles, no bloom); `prefers-reduced-motion` gets still frames,
  no pinning and no smooth scrolling (section 3 becomes a plain card grid with 2D icons).
- If WebGL is unavailable the hero/form fall back to a 2D illustration and the journey keeps working with 2D icons.
- Semantic headings, labelled form fields, keyboard-focusable controls, skip link, Open Graph + Twitter tags.
