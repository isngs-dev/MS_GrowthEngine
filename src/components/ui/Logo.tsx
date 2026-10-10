type Props = { className?: string; textClassName?: string; showText?: boolean };

/** iSN logo on a light chip (the artwork is dark blue, so it needs a light backing on the brown theme). */
export function IsnMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/isn-logo.png"
      alt="iSN"
      width={250}
      height={96}
      className={`block h-7 w-auto rounded-md bg-[#fbefe3] px-2 py-1 sm:h-9 ${className ?? ""}`}
    />
  );
}

/** iSN logo + "MS Growth Engine" wordmark. */
export default function Logo({ className, textClassName, showText = true }: Props) {
  return (
    <span className={`inline-flex items-center gap-2.5 sm:gap-3 ${className ?? ""}`}>
      <IsnMark />
      {showText && (
        <span className={`whitespace-nowrap font-display text-[0.95rem] font-bold tracking-tight text-white max-[479px]:sr-only sm:text-lg ${textClassName ?? ""}`}>
          MS Growth Engine
        </span>
      )}
    </span>
  );
}
