"use client";

import { useRef, useState } from "react";

const SRC = "/video/explainer.mp4";

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

/** Explainer video for the hero: muted autoplay loop with pause and sound toggles. */
export default function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);

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

  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-4 rounded-[2.4rem] bg-gradient-to-br from-blue/25 via-violet/20 to-cyan/20 blur-3xl" />
      <div className="gborder gborder-live relative rounded-[1.6rem]">
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
          className="relative z-10 aspect-video w-full rounded-[inherit] bg-ink-900 object-cover"
        />
        <div className="absolute bottom-3 right-3 z-20 flex gap-2">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause video" : "Play video"}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
          >
            <PlayPauseIcon playing={playing} />
          </button>
          <button
            type="button"
            onClick={toggleSound}
            aria-label={muted ? "Unmute video" : "Mute video"}
            aria-pressed={!muted}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
          >
            <SoundIcon muted={muted} />
          </button>
        </div>
      </div>
    </div>
  );
}
