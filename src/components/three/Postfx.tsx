"use client";

import type { Quality } from "@/lib/quality";

/**
 * Post-processing is intentionally off: a full-screen bloom pass was the single biggest
 * GPU cost. The glow comes from additive halo sprites and HDR basic materials instead.
 * Kept as a component so scenes can opt back in without touching their code.
 */
export default function Postfx(_props: { quality: Quality; strength?: number }) {
  void _props;
  return null;
}
