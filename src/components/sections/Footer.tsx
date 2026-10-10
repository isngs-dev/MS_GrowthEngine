import { IsnMark } from "@/components/ui/Logo";
import { BRAND, FOOTER } from "@/content/copy";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative border-t border-white/10 bg-ink-950/80 px-5 py-14 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
        <a href={BRAND.url} target="_blank" rel="noopener" aria-label="iSN Business Solutions (isngs.com)" className="rounded-lg">
          <IsnMark />
        </a>
        <a href={BRAND.url} target="_blank" rel="noopener" className="rounded-md text-base font-medium text-text underline decoration-cyan/50 underline-offset-4 hover:decoration-cyan">
          www.isngs.com
        </a>
        <p className="text-sm text-faint">
          &copy; {year} {BRAND.company}. {FOOTER.rights}
        </p>
      </div>
    </footer>
  );
}
