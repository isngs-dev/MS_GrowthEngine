/**
 * Mutable, per-frame state shared between DOM sections (GSAP / form) and the 3D
 * scenes. Kept outside React state on purpose: scenes read it inside useFrame.
 */

/** Section 2: 0 = nodes scattered, 1 = unified. */
export const nodesState = { p: 0, labels: [] as (HTMLElement | null)[] };

/** Section 4: closing line, 0 = three spheres apart, 1 = merged. */
export const closingState = { p: 0, xs: [0.2, 0.5, 0.8] as number[] };

/** Section 5: how many form fields are valid (0..1). Drives the engine spin. */
export const formState = { filled: 0 };

/** Section 3: scroll-driven journey. Pixel units, relative to the pinned stage. */
export const journey = {
  /** stage size in css px */
  w: 1,
  h: 1,
  /** current translation of the card row (px) */
  rowX: 0,
  /** orb x within the row, in row px */
  orbRowX: 0,
  /** y of the orb (px from the stage top) */
  orbY: 120,
  /** 0..1 outcome phase */
  outcome: 0,
  /** y of the track line (px from the stage top) */
  trackY: 120,
  /** per-station layout measured from the DOM, in row px */
  centers: [] as number[],
  iconX: [] as number[],
  iconY: [] as number[],
  iconSize: [] as number[],
  /** per-station active amount 0..1 */
  active: [] as number[],
  /** per-station "passed" amount 0..1 */
  done: [] as number[],
  trackStart: 0,
  trackEnd: 0,
};

/** Update the form completion that drives the engine spin (0..1, above 1 = celebration). */
export function setFormProgress(v: number) {
  formState.filled = v;
}
