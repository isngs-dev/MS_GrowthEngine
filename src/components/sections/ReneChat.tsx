"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useQuality";

/** Not in the brief: a short illustrative exchange so the "live chat" mockup has something to show. */
const SCRIPT = [
  { from: "rene", text: "Hi, I'm Rene. How can I help?" },
  { from: "you", text: "What services do you offer?" },
  { from: "rene", text: "Happy to share. Want to book a quick call?" },
] as const;

type Frame = { shown: number; typing: boolean };

/** Beats of the loop, in ms: [delay before the beat, frame after it]. */
const BEATS: [number, Frame][] = [
  [300, { shown: 0, typing: true }],
  [1300, { shown: 1, typing: false }],
  [1300, { shown: 1, typing: false }],
  [900, { shown: 2, typing: false }],
  [900, { shown: 2, typing: true }],
  [1500, { shown: 3, typing: false }],
  [3600, { shown: 3, typing: false }],
  [700, { shown: 0, typing: false }],
];

function Dots() {
  return (
    <span className="inline-flex items-center gap-1 px-1" aria-label="Rene is typing">
      {[0, 1, 2].map((i) => (
        <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan" style={{ animationDelay: `${i * 0.16}s` }} />
      ))}
    </span>
  );
}

/** Live-chat mockup: messages appear one by one with a typing indicator. */
export default function ReneChat({ play }: { play: boolean }) {
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState<Frame>({ shown: SCRIPT.length, typing: false });

  useEffect(() => {
    if (reduced) return;
    if (!play) return;
    let i = 0;
    let timer = 0;
    const step = () => {
      const [delay, f] = BEATS[i % BEATS.length];
      timer = window.setTimeout(() => {
        setFrame(f);
        i += 1;
        step();
      }, delay);
    };
    const reset = window.setTimeout(() => setFrame({ shown: 0, typing: false }), 0);
    step();
    return () => {
      window.clearTimeout(reset);
      window.clearTimeout(timer);
    };
  }, [play, reduced]);

  const { shown, typing } = reduced ? { shown: SCRIPT.length, typing: false } : frame;
  // who is typing next: Rene types message 1 and 3
  const typingFrom = shown === 0 || shown === 2 ? "rene" : "you";

  return (
    <div className="rounded-2xl border border-white/12 bg-ink-950/60 p-3 sm:p-3.5" role="img" aria-label="Chat preview: Rene greets a prospect, answers a question about services and offers to book a call">
      <div className="mb-2.5 flex items-center gap-2 border-b border-white/10 pb-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
        </span>
        <span className="font-display text-sm font-semibold text-white">Rene</span>
      </div>
      <div className="flex min-h-[8.6rem] flex-col justify-end gap-2" aria-hidden>
        {SCRIPT.slice(0, shown).map((m, i) => (
          <div
            key={`${i}-${m.text}`}
            className={`chat-in max-w-[88%] rounded-2xl px-3 py-2 text-[13px] leading-snug ${
              m.from === "rene" ? "self-start rounded-bl-md bg-blue/25 text-white" : "self-end rounded-br-md bg-white/12 text-white"
            }`}
          >
            {m.text}
          </div>
        ))}
        {typing && (
          <div className={`chat-in rounded-2xl px-3 py-2.5 ${typingFrom === "rene" ? "self-start rounded-bl-md bg-blue/25" : "self-end rounded-br-md bg-white/12"}`}>
            <Dots />
          </div>
        )}
      </div>
    </div>
  );
}
