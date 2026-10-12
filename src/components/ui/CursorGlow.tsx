"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useCanHover, useReducedMotion } from "@/hooks/useQuality";

/** Soft light that trails the mouse. Only mounted for fine-pointer devices. */
export default function CursorGlow() {
  const canHover = useCanHover();
  const reduced = useReducedMotion();
  const glow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canHover || !glow.current) return;
    const g = glow.current;

    gsap.set(g, { xPercent: -50, yPercent: -50, x: window.innerWidth / 2, y: window.innerHeight / 3 });
    const gx = gsap.quickTo(g, "x", { duration: reduced ? 0 : 0.7, ease: "power3.out" });
    const gy = gsap.quickTo(g, "y", { duration: reduced ? 0 : 0.7, ease: "power3.out" });

    let shown = false;
    const onMove = (e: PointerEvent) => {
      if (!shown) {
        shown = true;
        gsap.to(g, { opacity: 1, duration: 0.5 });
      }
      gx(e.clientX);
      gy(e.clientY);
    };
    const onLeave = () => {
      shown = false;
      gsap.to(g, { opacity: 0, duration: 0.4 });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [canHover, reduced]);

  if (!canHover) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60]">
      <div
        ref={glow}
        className="absolute left-0 top-0 h-[360px] w-[360px] rounded-full opacity-0"
        style={{
          background:
            "radial-gradient(closest-side, rgb(212 163 115 / 0.2), rgb(255 196 160 / 0.09) 45%, transparent 72%)",
          willChange: "transform",
        }}
      />
    </div>
  );
}
