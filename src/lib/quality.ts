/**
 * Rendering quality tiers.
 *
 *  - "static": reduced motion requested -> render still frames only
 *  - "low":    phones / data-saver / very weak hardware -> fewer particles, DPR 1
 *  - "medium": tablets, small laptops, mid hardware
 *  - "high":   capable desktops
 */
export type Quality = "high" | "medium" | "low" | "static";

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

export function detectQuality(): Quality {
  if (typeof window === "undefined") return "medium";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "static";

  const nav = navigator as NavigatorExtras;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 768;
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  const saveData = nav.connection?.saveData === true;

  if (saveData || memory <= 2 || cores <= 2) return "low";
  if (narrow || (coarse && window.innerWidth < 1024)) return "low";
  if (coarse || cores <= 4 || memory <= 4) return "medium";
  return "high";
}

export const QUALITY_SETTINGS = {
  high: { dpr: [1, 1.25] as [number, number], heroParticles: 300, ambient: 130, sheets: 20, globeNodes: 200 },
  medium: { dpr: [1, 1] as [number, number], heroParticles: 200, ambient: 90, sheets: 16, globeNodes: 140 },
  low: { dpr: [1, 1] as [number, number], heroParticles: 110, ambient: 45, sheets: 10, globeNodes: 90 },
  static: { dpr: [1, 1] as [number, number], heroParticles: 160, ambient: 70, sheets: 14, globeNodes: 120 },
} as const;
