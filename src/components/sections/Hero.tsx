"use client";

import RevealHeading from "@/components/ui/RevealHeading";
import CtaButton from "@/components/ui/CtaButton";
import { HeroScene } from "@/components/three/lazy";
import { scrollToId } from "@/lib/scroll";
import { HERO } from "@/content/copy";

/** Animated gradient mesh + soft volumetric light beams behind the 3D scene. */
function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="orb drift-a left-[28%] top-[8%] h-[60vw] w-[60vw] max-h-[820px] max-w-[820px] opacity-80"
        style={{ background: "radial-gradient(closest-side, rgb(212 163 115 / 0.34), transparent 70%)" }}
      />
      <div
        className="orb drift-b right-[-8%] top-[22%] h-[46vw] w-[46vw] max-h-[680px] max-w-[680px]"
        style={{ background: "radial-gradient(closest-side, rgb(230 164 184 / 0.32), transparent 70%)" }}
      />
      <div
        className="orb drift-c bottom-[-12%] right-[18%] h-[38vw] w-[38vw] max-h-[560px] max-w-[560px]"
        style={{ background: "radial-gradient(closest-side, rgb(255 196 160 / 0.24), transparent 70%)" }}
      />
      <div className="beam left-[46%]" style={{ ["--r" as string]: "16deg" }} />
      <div className="beam left-[62%]" style={{ ["--r" as string]: "-14deg", animationDelay: "-6s", opacity: 0.4 }} />
      <div className="beam left-[78%]" style={{ ["--r" as string]: "22deg", animationDelay: "-3s", opacity: 0.3 }} />
    </div>
  );
}

function ScrollCue() {
  return (
    <a
      href="#system-statement"
      aria-label="Scroll down"
      onClick={(e) => {
        e.preventDefault();
        scrollToId("system-statement");
      }}
      className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 rounded-full p-2 sm:flex"
    >
      <span className="relative flex h-11 w-7 justify-center rounded-full border border-white/35 pt-2">
        <span className="scroll-cue-dot h-2 w-1 rounded-full bg-cyan shadow-[0_0_10px_2px_rgb(255_196_160/0.8)]" />
      </span>
    </a>
  );
}

export default function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative flex min-h-[100svh] items-start overflow-hidden px-5 pt-32 sm:px-8 lg:items-center lg:pt-24"
    >
      <HeroBackdrop />
      <HeroScene />
      <div aria-hidden className="scrim-left pointer-events-none absolute inset-y-0 left-0 w-full lg:w-[58%]" />
      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="max-w-2xl lg:max-w-[48%]">
          <RevealHeading
            as="h1"
            id="hero-title"
            text={HERO.headline}
            highlight={HERO.headlineHighlight}
            trigger="load"
            delay={0.35}
            className="font-display text-[clamp(2.7rem,5.8vw,5.7rem)] font-bold leading-[0.98] text-white"
          />
          <div className="mt-10">
            <CtaButton>{HERO.cta}</CtaButton>
          </div>
        </div>
      </div>
      <ScrollCue />
    </section>
  );
}
