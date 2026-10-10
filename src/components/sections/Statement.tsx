"use client";

import { useRef } from "react";
import RevealHeading from "@/components/ui/RevealHeading";
import SectionNumber from "@/components/ui/SectionNumber";
import { NodesScene } from "@/components/three/lazy";
import { nodesState } from "@/components/three/progress";
import { gsap } from "@/lib/gsap";
import { useIsoLayoutEffect } from "@/hooks/useIsoLayoutEffect";
import { useReducedMotion } from "@/hooks/useQuality";
import { STATEMENT } from "@/content/copy";

/**
 * Section 2. Pinned for a few screens: four nodes drift together into one
 * connected shape while the three "No..." statements appear one at a time and
 * get struck through.
 */
export default function Statement() {
  const reduced = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const el = stage.current;
    const box = list.current;
    if (!el || !box) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodesState.p = 1;
      return;
    }
    const items = Array.from(box.querySelectorAll<HTMLElement>("[data-no]"));
    const mobile = window.innerWidth < 768;

    const ctx = gsap.context(() => {
      nodesState.p = 0;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * (mobile ? 1.4 : 1.7))}`,
          pin: true,
          scrub: 0.25,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      tl.to(nodesState, { p: 1, duration: 8.6 }, 0.2);
      items.forEach((item, i) => {
        const t0 = 0.5 + i * 2.7;
        const line = item.querySelector<HTMLElement>(".strike");
        gsap.set(item, { opacity: 0 });
        tl.fromTo(item, { opacity: 0, y: 46 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, t0);
        if (line) tl.to(line, { "--s": "100%", duration: 0.65, ease: "power2.inOut" }, t0 + 1.15);
        tl.to(item, { opacity: 0, y: -34, scale: 1.035, duration: 0.6, ease: "power2.in" }, t0 + 2.05);
      });
      tl.to({}, { duration: 0.4 });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section id="system-statement" tabIndex={-1} aria-labelledby="statement-title" className="relative outline-none">
      <div ref={stage} className="relative min-h-[100svh] overflow-hidden">
        <div aria-hidden className="absolute inset-0">
          <NodesScene />
          {/* labels are positioned by the scene every frame */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {STATEMENT.nodes.map((n, i) => (
              <span
                key={n}
                ref={(el) => void (nodesState.labels[i] = el)}
                className="absolute left-0 top-0 whitespace-nowrap rounded-full border border-white/20 bg-ink-950/75 px-3.5 py-1.5 font-display text-sm font-semibold text-white opacity-0 shadow-[0_0_24px_-4px_rgb(255_196_160/0.5)] backdrop-blur-md sm:text-base"
                style={{ willChange: "transform" }}
              >
                {n}
              </span>
            ))}
          </div>
        </div>
        <div aria-hidden className="scrim-left pointer-events-none absolute inset-0" />
        <SectionNumber n="02" className="right-3 top-24 sm:right-10" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-between gap-10 px-5 pb-14 pt-28 sm:px-8 sm:pt-32">
          <div className="max-w-2xl">
            <RevealHeading
              as="h2"
              id="statement-title"
              text={STATEMENT.headline}
              highlight={STATEMENT.headlineHighlight}
              className="font-display text-[clamp(2.1rem,4.6vw,4.3rem)] font-bold leading-[1.02] text-white"
            />
            <p className="mt-6 max-w-xl text-base leading-relaxed text-text/90 sm:text-lg">{STATEMENT.body}</p>
            <ul className="sr-only">
              {STATEMENT.nodes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>

          <div ref={list} className={reduced ? "flex flex-col gap-5" : "grid"}>
            {STATEMENT.nos.map((text) => (
              <p
                key={text}
                data-no
                className={`font-display text-[clamp(1.7rem,4.3vw,3.9rem)] font-bold leading-[1.08] text-white max-w-4xl ${
                  reduced ? "" : "col-start-1 row-start-1"
                }`}
              >
                <span className="strike" style={{ ["--s" as string]: reduced ? "100%" : "0%" }}>
                  {text}
                </span>
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
