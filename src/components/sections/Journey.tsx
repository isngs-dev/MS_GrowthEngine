"use client";

import { useCallback, useRef, useState } from "react";
import RevealHeading from "@/components/ui/RevealHeading";
import TiltCard from "@/components/features/TiltCard";
import StepIcon from "@/components/ui/StepIcon";
import ReneChat from "@/components/sections/ReneChat";
import { JourneyScene } from "@/components/three/lazy";
import { journey } from "@/components/three/progress";
import { clamp, easeInOutCubic, easeOutBack, easeOutCubic, seg, smooth } from "@/components/three/math";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useIsoLayoutEffect } from "@/hooks/useIsoLayoutEffect";
import { useReducedMotion } from "@/hooks/useQuality";
import { SYSTEM } from "@/content/copy";

const STEPS = SYSTEM.steps;
const RENE = 4;
/** scroll length of the pinned journey, in "units": one per station + the outcome finale */
const OUTCOME_UNITS = 1.8;
const UNITS = STEPS.length + OUTCOME_UNITS;
const TRAVEL = 0.42;

/** Offset of `el` inside `ancestor`, ignoring CSS transforms (so scale/tilt never skews the layout). */
function offsetWithin(el: HTMLElement, ancestor: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== ancestor) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

function Card({ i, children, reneActive }: { i: number; children?: React.ReactNode; reneActive?: boolean }) {
  const step = STEPS[i];
  const rene = i === RENE;
  return (
    <article
      data-card
      aria-labelledby={`step-${step.n}`}
      className={`step-card relative shrink-0 self-start ${
        rene ? "w-[min(88vw,440px)] lg:w-[880px]" : "w-[min(84vw,350px)] md:w-[430px]"
      }`}
    >
      <TiltCard border="hover" max={rene ? 2.5 : 5} className="h-full">
        <div className={`relative z-10 p-5 sm:p-9 ${rene ? "lg:grid lg:grid-cols-[1fr_1.08fr] lg:gap-10" : ""}`}>
          <div>
            <div className="flex items-start justify-between gap-3">
              <span className="outline-num" aria-hidden>
                {step.n}
              </span>
              {/* the 3D icon is drawn into this slot by the canvas overlay */}
              <div
                data-slot
                className={`icon-slot relative shrink-0 ${rene ? "h-[104px] w-[104px] lg:hidden" : "h-[96px] w-[96px] sm:h-[140px] sm:w-[140px]"}`}
              >
                <StepIcon index={i} className="fb-icon h-full w-full p-2" />
              </div>
            </div>
            <h3 id={`step-${step.n}`} className="mt-3 font-display text-[1.5rem] font-bold tracking-[0.16em] text-white sm:text-[1.95rem]">
              <span className="sr-only">{step.n} </span>
              {step.name}
            </h3>
            <p className="mt-3 text-[0.98rem] leading-relaxed text-text/90 sm:text-[1.1rem]">{step.body}</p>
          </div>
          {rene && (
            <div className="mt-5 lg:mt-0">
              <div data-slot-lg className="icon-slot relative mx-auto hidden h-[190px] w-[190px] lg:block">
                <StepIcon index={i} className="fb-icon h-full w-full p-4" />
              </div>
              <ReneChat play={!!reneActive} />
            </div>
          )}
        </div>
      </TiltCard>
      {children}
    </article>
  );
}

/** Reduced-motion / no-scroll-jacking version: the same eight cards as a plain grid. */
function StaticJourney() {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-28 sm:px-8">
      <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((_, i) => (
          <li key={i} className={`flex ${i === RENE ? "md:col-span-2 lg:col-span-2" : ""}`}>
            <div className="step-card static-card w-full">
              <StaticCard i={i} />
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-20 text-center">
        <p className="font-display text-xl font-bold tracking-[0.2em] text-cyan">{SYSTEM.outcomeLabel}</p>
        <ul className="mt-8 grid gap-5 md:grid-cols-3">
          {SYSTEM.outcome.map((t) => (
            <li key={t} className="glass gborder gborder-live rounded-3xl p-8 font-display text-2xl font-bold leading-tight text-white">
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StaticCard({ i }: { i: number }) {
  const step = STEPS[i];
  return (
    <TiltCard border="hover" max={4} className="h-full w-full">
      <div className="relative z-10 p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <span className="outline-num" aria-hidden>
            {step.n}
          </span>
          <StepIcon index={i} className="fb-icon h-[88px] w-[88px] shrink-0 p-2" />
        </div>
        <h3 className="mt-3 font-display text-[1.5rem] font-bold tracking-[0.16em] text-white">
          <span className="sr-only">{step.n} </span>
          {step.name}
        </h3>
        <p className="mt-3 text-base leading-relaxed text-text/90">{step.body}</p>
        {i === RENE && (
          <div className="mt-5">
            <ReneChat play={false} />
          </div>
        )}
      </div>
    </TiltCard>
  );
}

export default function Journey() {
  const reduced = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLOListElement>(null);
  const outcome = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const activeRef = useRef(0);

  const onReady = useCallback(() => {
    stage.current?.setAttribute("data-gl", "1");
  }, []);

  useIsoLayoutEffect(() => {
    const el = stage.current;
    const rw = row.current;
    const out = outcome.current;
    if (!el || !rw || !out || reduced) return;

    const cards = Array.from(rw.querySelectorAll<HTMLElement>("[data-card]"));
    const outCards = Array.from(out.querySelectorAll<HTMLElement>("[data-outcome-card]"));
    const outLabel = out.querySelector<HTMLElement>("[data-outcome-label]");
    const mobile = () => window.innerWidth < 768;
    const J = journey;

    const measure = () => {
      J.w = el.clientWidth;
      J.h = el.clientHeight;
      J.trackY = clamp(J.h * (mobile() ? 0.17 : 0.24), mobile() ? 96 : 130, 220);
      rw.style.paddingTop = `${J.trackY + 52}px`;
      J.centers = cards.map((c) => {
        const o = offsetWithin(c, rw);
        return o.x + c.offsetWidth / 2;
      });
      cards.forEach((c, i) => {
        // the Rene card has two slots: the wide-layout one is the visible one on lg screens
        const slots = Array.from(c.querySelectorAll<HTMLElement>("[data-slot], [data-slot-lg]")).filter((s) => s.offsetParent !== null);
        const slot = slots[0];
        if (!slot) return;
        const o = offsetWithin(slot, rw);
        J.iconX[i] = o.x + slot.offsetWidth / 2;
        J.iconY[i] = o.y + slot.offsetHeight / 2;
        J.iconSize[i] = slot.offsetWidth * (i === RENE ? 1.05 : 0.95);
      });
      J.trackStart = (J.centers[0] ?? 0) - J.w;
      J.trackEnd = (J.centers[STEPS.length - 1] ?? 0) + 260;
    };

    const centerAt = (s: number) => {
      const a = Math.floor(clamp(s, 0, STEPS.length - 1));
      const b = Math.min(STEPS.length - 1, a + 1);
      return (J.centers[a] ?? 0) + ((J.centers[b] ?? 0) - (J.centers[a] ?? 0)) * (s - a);
    };

    const update = (p: number) => {
      const u = clamp(p) * UNITS;
      let sRow = 0;
      let sOrb = 0;
      if (u >= STEPS.length) {
        sRow = sOrb = STEPS.length - 1;
      } else {
        const i = Math.floor(u);
        const f = u - i;
        if (i > 0) {
          sRow = i - 1 + easeInOutCubic(clamp(f / TRAVEL));
          sOrb = i - 1 + easeOutCubic(clamp(f / (TRAVEL * 0.7)));
        }
      }
      const o = clamp((u - STEPS.length) / OUTCOME_UNITS);
      J.outcome = o;
      J.rowX = J.w / 2 - centerAt(sRow);
      J.orbRowX = centerAt(sOrb);

      cards.forEach((c, i) => {
        const act = smooth(1 - Math.abs(sRow - i) * 1.7);
        const done = smooth(seg(sOrb, i - 0.6, i - 0.1));
        J.active[i] = act;
        J.done[i] = done;
        c.style.setProperty("--act", act.toFixed(3));
        c.style.setProperty("--done", done.toFixed(3));
      });

      const rowFade = 1 - seg(o, 0, 0.18);
      rw.style.transform = `translate3d(${J.rowX.toFixed(1)}px,0,0)`;
      rw.style.opacity = String(rowFade);
      rw.style.visibility = rowFade <= 0.01 ? "hidden" : "visible";

      if (outLabel) {
        const k = seg(o, 0.1, 0.3);
        outLabel.style.opacity = String(k);
        outLabel.style.transform = `translate3d(0,${((1 - k) * 18).toFixed(1)}px,0)`;
      }
      outCards.forEach((c, k) => {
        const f = easeOutBack(seg(o, 0.43 + k * 0.1, 0.6 + k * 0.1));
        const vis = seg(o, 0.43 + k * 0.1, 0.5 + k * 0.1);
        c.style.opacity = String(vis);
        c.style.transform = `perspective(1100px) rotateY(${((1 - f) * -100).toFixed(1)}deg) translate3d(0,${((1 - f) * 30).toFixed(1)}px,0) scale(${(0.9 + f * 0.1).toFixed(3)})`;
      });

      const near = Math.round(sRow);
      if (Math.abs(sRow - near) < 0.25 && near !== activeRef.current) {
        activeRef.current = near;
        setActiveStep(near);
      }
    };

    const ctx = gsap.context(() => {
      measure();
      update(0);
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: () => `+=${Math.round(window.innerHeight * UNITS * (mobile() ? 0.28 : 0.34))}`,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => update(self.progress),
        onRefresh: (self) => {
          measure();
          update(self.progress);
        },
      });
    }, el);

    const ro = new ResizeObserver(() => ScrollTrigger.refresh());
    ro.observe(el);
    document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => {});

    return () => {
      ro.disconnect();
      ctx.revert();
    };
  }, [reduced]);

  return (
    <section id="system" aria-labelledby="system-title" className="relative">
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-28 text-center sm:px-8 sm:pb-24 sm:pt-40">
        <RevealHeading
          as="h2"
          id="system-title"
          text={SYSTEM.headline}
          highlight={SYSTEM.headlineHighlight}
          className="font-display text-[clamp(2.2rem,5vw,4.6rem)] font-bold leading-[1.02] text-white"
        />
        <p className="mx-auto mt-7 max-w-3xl text-base leading-relaxed text-text/90 sm:text-xl">{SYSTEM.sub}</p>
      </div>

      {reduced ? (
        <StaticJourney />
      ) : (
        <div ref={stage} className="journey relative h-[100svh] min-h-[640px] overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 z-20">
            <JourneyScene onReady={onReady} />
          </div>

          <ol ref={row} className="absolute left-0 top-0 z-10 flex h-full w-max items-start gap-6 will-change-transform md:gap-9" style={{ opacity: 1 }}>
            {STEPS.map((_, i) => (
              <li key={i} className="flex">
                <Card i={i} reneActive={activeStep === RENE} />
              </li>
            ))}
          </ol>

          <div ref={outcome} className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-5">
            <p data-outcome-label className="mb-6 font-display text-lg font-bold tracking-[0.28em] text-cyan opacity-0 sm:mb-10 sm:text-2xl" style={{ textShadow: "0 0 24px rgb(255 196 160 / 0.6)" }}>
              {SYSTEM.outcomeLabel}
            </p>
            <ul className="grid w-full max-w-6xl gap-4 md:grid-cols-3 md:gap-6">
              {SYSTEM.outcome.map((t) => (
                <li
                  key={t}
                  data-outcome-card
                  className="glass gborder gborder-live rounded-3xl px-6 py-7 text-center font-display text-[clamp(1.35rem,2.3vw,2.1rem)] font-bold leading-[1.12] text-white opacity-0 md:px-8 md:py-14"
                  style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden", boxShadow: "0 0 70px -10px rgb(255 196 160 / 0.45), inset 0 1px 0 rgb(255 255 255 / 0.2)" }}
                >
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
