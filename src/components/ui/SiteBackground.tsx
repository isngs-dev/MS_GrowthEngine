/**
 * Fixed, page-wide backdrop: deep navy base, drifting gradient mesh, a faint
 * grid and film-grain noise. Pure CSS + transforms, so it costs the GPU almost
 * nothing while scrolling.
 */
export default function SiteBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, #3a2518 0%, #1a120d 55%, #130d09 100%)",
        }}
      />
      <div
        className="orb drift-a left-[-12vw] top-[-8vh] h-[60vw] w-[60vw] max-h-[900px] max-w-[900px]"
        style={{ background: "radial-gradient(closest-side, rgb(212 163 115 / 0.28), transparent 70%)" }}
      />
      <div
        className="orb drift-b right-[-14vw] top-[18vh] h-[55vw] w-[55vw] max-h-[820px] max-w-[820px]"
        style={{ background: "radial-gradient(closest-side, rgb(230 164 184 / 0.26), transparent 70%)" }}
      />
      <div
        className="orb drift-c bottom-[-18vh] left-[22vw] h-[50vw] w-[50vw] max-h-[760px] max-w-[760px]"
        style={{ background: "radial-gradient(closest-side, rgb(255 196 160 / 0.16), transparent 70%)" }}
      />
      <div className="bg-grid absolute inset-0" />
      <div className="bg-noise absolute inset-0" />
    </div>
  );
}
