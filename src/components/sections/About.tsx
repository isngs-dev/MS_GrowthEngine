"use client";

import { Fragment, useRef } from "react";
import RevealHeading from "@/components/ui/RevealHeading";
import SectionNumber from "@/components/ui/SectionNumber";
import TiltCard from "@/components/features/TiltCard";
import { AboutScene, ClosingScene } from "@/components/three/lazy";
import { closingState } from "@/components/three/progress";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useIsoLayoutEffect } from "@/hooks/useIsoLayoutEffect";
import { ABOUT, BRAND } from "@/content/copy";

const LINK_CLASS = "rounded-md font-semibold text-white underline decoration-cyan/70 decoration-2 underline-offset-4 transition-colors hover:text-cyan hover:decoration-cyan";

/** Turns every standalone "iSN" in a sentence into a link to isngs.com. */
function WithIsnLink({ text }: { text: string }) {
  const parts = text.split(/\b(iSN)\b/);
  return (
    <>
      {parts.map((part, i) =>
        part === "iSN" ? (
          <a key={i} href={BRAND.url} target="_blank" rel="noopener" className={LINK_CLASS}>
            iSN
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function StatCard({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const num = useRef<HTMLSpanElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const root = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const el = root.current;
    const out = num.current;
    const arc = ring.current;
    if (!el || !out || !arc) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const C = 2 * Math.PI * 52;
    const ctx = gsap.context(() => {
      out.textContent = "0";
      gsap.set(arc, { strokeDasharray: C, strokeDashoffset: C });
      const counter = { v: 0 };
      ScrollTrigger.create({
        trigger: el,
        start: "top 82%",
        once: true,
        onEnter: () => {
          gsap.to(counter, { v: value, duration: 2.4, ease: "power2.out", onUpdate: () => void (out.textContent = String(Math.round(counter.v))) });
          gsap.to(arc, { strokeDashoffset: C * 0.06, duration: 2.4, ease: "power2.out" });
        },
      });
    }, el);
    return () => ctx.revert();
  }, [value]);

  return (
    <div ref={root}>
      <TiltCard border="live" max={9} className="h-full rounded-[2rem]">
        <div className="relative z-10 flex flex-col items-center px-6 py-9 text-center sm:py-11" style={{ transform: "translateZ(24px)" }}>
          <div className="relative flex h-[10.5rem] w-[10.5rem] items-center justify-center sm:h-[12rem] sm:w-[12rem]">
            <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90 overflow-visible" aria-hidden>
              <defs>
                <linearGradient id={`stat-g-${value}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#d4a373" />
                  <stop offset="0.6" stopColor="#ffc4a0" />
                  <stop offset="1" stopColor="#e6a4b8" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="5" />
              <circle
                ref={ring}
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke={`url(#stat-g-${value})`}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={2 * Math.PI * 52 * 0.06}
                style={{ filter: "drop-shadow(0 0 7px rgb(255 196 160 / 0.85))" }}
              />
            </svg>
            <svg viewBox="0 0 120 120" className="stat-orbit absolute -inset-3 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)]" aria-hidden>
              <circle cx="60" cy="60" r="58" fill="none" stroke="rgb(255 217 191 / 0.35)" strokeWidth="0.7" strokeDasharray="1.5 5" />
              <circle cx="60" cy="2" r="2" fill="#ffd9bf" style={{ filter: "drop-shadow(0 0 5px #ffc4a0)" }} />
            </svg>
            <p className="relative font-display font-bold leading-none text-white" aria-label={`${value}${suffix}`}>
              <span aria-hidden className={value >= 100 ? "text-[2.9rem] sm:text-[3.5rem]" : "text-[3.4rem] sm:text-[4.2rem]"}>
                <span ref={num}>{value}</span>
                <span className="gradient-text">{suffix}</span>
              </span>
            </p>
          </div>
          <p className="mt-6 max-w-[14rem] font-display text-lg font-semibold leading-snug text-text sm:text-xl">{label}</p>
        </div>
      </TiltCard>
    </div>
  );
}

function ClosingLine() {
  const root = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLParagraphElement>(null);

  useIsoLayoutEffect(() => {
    const el = root.current;
    const p = line.current;
    if (!el || !p) return;
    const pluses = Array.from(p.querySelectorAll<HTMLElement>("[data-plus]"));
    const terms = Array.from(p.querySelectorAll<HTMLElement>("[data-term]"));

    const measure = () => {
      const box = el.getBoundingClientRect();
      if (box.width < 1) return;
      const stacked = terms.length > 1 && Math.abs(terms[0].getBoundingClientRect().left - terms[1].getBoundingClientRect().left) < 8;
      closingState.xs = stacked
        ? [0.22, 0.5, 0.78]
        : terms.map((t) => {
            const r = t.getBoundingClientRect();
            return (r.left + r.width / 2 - box.left) / box.width;
          });
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      closingState.p = 1;
      p.style.setProperty("--glow", "1");
      measure();
      return;
    }

    const ctx = gsap.context(() => {
      measure();
      closingState.p = 0;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          end: "bottom 62%",
          scrub: 0.25,
          onUpdate: (self) => void (closingState.p = self.progress),
          onRefresh: measure,
        },
      });
      tl.to(pluses, { rotate: 540, scale: 1.55, duration: 0.55, stagger: 0.04, ease: "power1.inOut" }, 0.1)
        .to(pluses, { scale: 0.85, duration: 0.3, ease: "power2.out" }, 0.65)
        .fromTo(p, { "--glow": 0 }, { "--glow": 1, duration: 0.35 }, 0.65);
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="relative mt-28 sm:mt-36">
      <div aria-hidden className="relative h-[210px] w-full sm:h-[280px]">
        <ClosingScene />
      </div>
      <p
        ref={line}
        className="lit-line relative -mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center font-display text-[clamp(1.5rem,3.3vw,3rem)] font-bold leading-[1.1] text-white sm:gap-x-6"
      >
        {ABOUT.closing.map((term, i) => (
          <Fragment key={term}>
            <span data-term>{term}</span>
            {i < ABOUT.closing.length - 1 && (
              <span data-plus className="inline-block text-cyan" style={{ textShadow: "0 0 24px rgb(255 196 160 / 0.9)" }}>
                +
              </span>
            )}
          </Fragment>
        ))}
      </p>
      <p className="mx-auto mt-8 max-w-2xl text-center text-base leading-relaxed text-text/90 sm:text-xl">{ABOUT.closingSub}</p>
    </div>
  );
}

export default function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="relative overflow-clip py-28 sm:py-40">
      {/* sticky 3D globe stays in view for the whole section */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="sticky top-0 h-[100svh] w-full opacity-90">
          <AboutScene />
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950/0 via-ink-950/35 to-ink-950/0" />
      <SectionNumber n="04" className="right-2 top-6 sm:right-10" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <RevealHeading
          as="h2"
          id="about-title"
          text={ABOUT.headline}
          highlight={ABOUT.headlineHighlight}
          links={{ "iSN.": BRAND.url }}
          className="max-w-4xl font-display text-[clamp(2.2rem,5vw,4.6rem)] font-bold leading-[1.02] text-white"
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-3 lg:gap-6">
          {ABOUT.paragraphs.map((p) => (
            <div key={p} className="glass rounded-3xl p-6 sm:p-8">
              <p className="text-base leading-relaxed text-text/90 sm:text-[1.075rem]">
                <WithIsnLink text={p} />
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {ABOUT.stats.map((s) => (
            <StatCard key={s.label} value={s.value} suffix={s.suffix} label={s.label} />
          ))}
        </div>

        <ClosingLine />
      </div>
    </section>
  );
}
