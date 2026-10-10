/** Decorative oversized outlined section number (hidden from assistive tech). */
export default function SectionNumber({ n, className }: { n: string; className?: string }) {
  return (
    <span aria-hidden className={`big-num pointer-events-none absolute text-[clamp(7rem,20vw,17rem)] ${className ?? ""}`}>
      {n}
    </span>
  );
}
