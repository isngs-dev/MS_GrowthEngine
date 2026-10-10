"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { gsap } from "@/lib/gsap";
import { useIsoLayoutEffect } from "@/hooks/useIsoLayoutEffect";
import { useReducedMotion } from "@/hooks/useQuality";
import { FORM } from "@/content/copy";

const COLORS = ["#d4a373", "#ffc4a0", "#e6a4b8", "#f4b8d0", "#bfe0c2", "#a8d5ba"];
const PARTICLES = 44;

/** Animated confirmation: the checkmark draws itself, then a particle burst fires. */
export default function SuccessState({ note }: { note?: string }) {
  const burst = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useIsoLayoutEffect(() => {
    const box = burst.current;
    if (!box || reduced) return;
    const dots = box.querySelectorAll<HTMLElement>("[data-dot]");
    const ctx = gsap.context(() => {
      dots.forEach((dot, i) => {
        const angle = (i / dots.length) * Math.PI * 2 + gsap.utils.random(-0.25, 0.25);
        const distance = gsap.utils.random(70, 190);
        gsap.fromTo(
          dot,
          { x: 0, y: 0, scale: gsap.utils.random(0.7, 1.4), opacity: 1 },
          {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            scale: 0,
            opacity: 0,
            duration: gsap.utils.random(0.9, 1.7),
            ease: "power3.out",
            delay: 0.55 + gsap.utils.random(0, 0.12),
          },
        );
      });
    }, box);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="flex min-h-[26rem] flex-col items-center justify-center py-6 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="relative mb-8 flex h-28 w-28 items-center justify-center">
        <div ref={burst} aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {Array.from({ length: PARTICLES }).map((_, i) => (
            <span
              key={i}
              data-dot
              className="absolute h-2 w-2 rounded-full opacity-0"
              style={{ background: COLORS[i % COLORS.length], boxShadow: `0 0 12px ${COLORS[i % COLORS.length]}` }}
            />
          ))}
        </div>

        <svg viewBox="0 0 100 100" className="relative h-full w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="ok-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#a8d5ba" />
              <stop offset="1" stopColor="#ffc4a0" />
            </linearGradient>
          </defs>
          <g transform="rotate(-90 50 50)">
            <motion.circle
              cx="50"
              cy="50"
              r="42"
              fill="rgb(168 213 186 / 0.1)"
              stroke="url(#ok-grad)"
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              style={{ filter: "drop-shadow(0 0 12px rgb(168 213 186 / 0.6))" }}
            />
          </g>
          <motion.path
            d="M30 52 L44 66 L71 36"
            fill="none"
            stroke="url(#ok-grad)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: reduced ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: reduced ? 0 : 0.55, ease: "easeOut" }}
            style={{ filter: "drop-shadow(0 0 10px rgb(255 196 160 / 0.7))" }}
          />
        </svg>
      </div>

      <p className="max-w-sm font-display text-3xl font-bold leading-tight text-white sm:text-4xl">{FORM.success}</p>
      {note && <p className="mt-4 max-w-sm text-base leading-relaxed text-text/90">{note}</p>}
    </motion.div>
  );
}
