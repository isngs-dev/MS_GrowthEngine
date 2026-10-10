import SmoothScroll from "@/components/providers/SmoothScroll";
import SiteBackground from "@/components/ui/SiteBackground";
import ScrollProgress from "@/components/ui/ScrollProgress";
import CursorGlow from "@/components/ui/CursorGlow";
import Navbar from "@/components/ui/Navbar";
import Hero from "@/components/sections/Hero";
import Statement from "@/components/sections/Statement";
import Journey from "@/components/sections/Journey";
import About from "@/components/sections/About";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/sections/Footer";

export default function Page() {
  return (
    <SmoothScroll>
      <a
        href="#build"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-black"
      >
        Skip to the form
      </a>
      <SiteBackground />
      <ScrollProgress />
      <CursorGlow />
      <Navbar />
      <main id="top">
        <Hero />
        <Statement />
        <Journey />
        <About />
        <Contact />
      </main>
      <Footer />
    </SmoothScroll>
  );
}
