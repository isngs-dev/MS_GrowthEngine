"use client";

import { useEffect, useRef, useState } from "react";

const SRC = "/video/explainer.mp4";

const BTN =
  "flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white backdrop-blur transition hover:bg-black/70";

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none" />
      {muted ? (
        <path d="m16 9 5 6m0-6-5 6" />
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </svg>
  );
}

function PlayPauseIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      {playing ? <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <path d="M8 5v14l11-7z" />}
    </svg>
  );
}

function ExpandIcon({ full }: { full: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {full ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
    </svg>
  );
}

/** Explainer video for the hero: muted autoplay loop with pause, sound and fullscreen controls. */
export default function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  // "Full screen" is a fixed full-viewport overlay, so it works in every browser/webview; the
  // native Fullscreen API is requested on top of it where supported (it can hang in embedded webviews).
  const [full, setFull] = useState(false);
  const wasNative = useRef(false);

  useEffect(() => {
    const sync = () => {
      const active = document.fullscreenElement === frameRef.current;
      if (!active && wasNative.current) setFull(false); // user left native fullscreen (Esc)
      wasNative.current = active;
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [full]);

  const togglePlay = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  const toggleSound = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted) void v.play();
  };

  const toggleFullscreen = () => {
    const frame = frameRef.current;
    if (!frame) return;
    if (full) {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      setFull(false);
      return;
    }
    setFull(true);
    frame.requestFullscreen?.().catch(() => {});
  };

  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-4 rounded-[2.4rem] bg-gradient-to-br from-blue/25 via-violet/20 to-cyan/20 blur-3xl" />
      <div
        ref={frameRef}
        // .gborder sets position:relative outside Tailwind's layers, so it is dropped while full screen
        className={
          full
            ? "fixed inset-0 z-[200] flex items-center justify-center bg-black"
            : "gborder gborder-live relative rounded-[1.6rem]"
        }
      >
        <video
          ref={ref}
          src={SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          aria-label="MS Growth Engine explainer video"
          className={`relative z-10 w-full rounded-[inherit] bg-ink-900 ${full ? "h-full object-contain" : "aspect-video object-cover"}`}
        />
        <div className={`absolute z-20 flex gap-2 ${full ? "bottom-6 right-6" : "bottom-3 right-3"}`}>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause video" : "Play video"}
            className={BTN}
          >
            <PlayPauseIcon playing={playing} />
          </button>
          <button
            type="button"
            onClick={toggleSound}
            aria-label={muted ? "Unmute video" : "Mute video"}
            aria-pressed={!muted}
            className={BTN}
          >
            <SoundIcon muted={muted} />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={full ? "Exit full screen" : "Full screen"}
            className={BTN}
          >
            <ExpandIcon full={full} />
          </button>
        </div>
      </div>
    </div>
  );
}
