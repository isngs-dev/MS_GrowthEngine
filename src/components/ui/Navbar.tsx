"use client";

import { useEffect, useState } from "react";
import Logo from "@/components/ui/Logo";
import CtaButton from "@/components/ui/CtaButton";
import { BRAND, NAV } from "@/content/copy";

/** Sticky glass navbar: logo on the left, primary CTA on the right. */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <nav
        aria-label="Primary"
        className={`glass mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-3 py-2.5 transition-all duration-500 sm:px-5 ${
          scrolled ? "bg-ink-900/70 shadow-[0_20px_60px_-20px_rgb(0_0_0/0.9)]" : ""
        }`}
      >
        <a href={BRAND.url} target="_blank" rel="noopener" aria-label="iSN Business Solutions (isngs.com)" className="rounded-lg">
          <Logo />
        </a>
        <CtaButton size="sm" pulse={false}>
          {NAV.cta}
        </CtaButton>
      </nav>
    </header>
  );
}
