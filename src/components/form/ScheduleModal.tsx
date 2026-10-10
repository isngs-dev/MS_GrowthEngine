"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MEETING_TIME_ZONE, todayInMeetingZone, validateMeeting, type Meeting, type MeetingErrors } from "@/lib/schedule";
import { SCHEDULE } from "@/content/copy";

type Props = {
  busy: boolean;
  error: string | null;
  onBook: (meeting: Meeting) => void;
  onDecline: () => void;
};

const fieldClass =
  "field-input h-14 w-full rounded-2xl border border-white/15 bg-white/[0.04] px-4 text-base text-white [color-scheme:dark]";

/** "Schedule a meet" pop-up shown after the contact form is submitted. */
export default function ScheduleModal({ busy, error, onBook, onDecline }: Props) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [errors, setErrors] = useState<MeetingErrors>({});
  const timeZone = MEETING_TIME_ZONE;
  const panel = useRef<HTMLDivElement>(null);
  const dateInput = useRef<HTMLInputElement>(null);

  // focus the first field, lock page scroll, restore on close
  useEffect(() => {
    dateInput.current?.focus();
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  // Escape = decline; Tab stays inside the dialog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        onDecline();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = panel.current.querySelectorAll<HTMLElement>("input, button:not([disabled])");
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onDecline]);

  const book = () => {
    const meeting = { date, time, timeZone };
    const found = validateMeeting(meeting);
    setErrors(found);
    if (found.date || found.time) {
      (found.date ? dateInput.current : panel.current?.querySelector<HTMLInputElement>("#meet-time"))?.focus();
      return;
    }
    onBook(meeting);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-ink-950/80 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      data-lenis-prevent
    >
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meet-title"
        aria-describedby="meet-desc"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="glass gborder gborder-live relative my-auto w-full max-w-md rounded-[2rem] bg-ink-900/90 p-6 sm:p-8"
      >
        <h3 id="meet-title" className="font-display text-3xl font-bold leading-tight text-white">
          {SCHEDULE.title}
        </h3>
        <p id="meet-desc" className="mt-3 text-base leading-relaxed text-text/90">
          {SCHEDULE.body}
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="meet-date" className="mb-1.5 block text-sm font-medium text-muted">
              {SCHEDULE.date}
            </label>
            <input
              ref={dateInput}
              id="meet-date"
              type="date"
              min={todayInMeetingZone()}
              value={date}
              disabled={busy}
              onChange={(e) => {
                setDate(e.target.value);
                setErrors((x) => ({ ...x, date: undefined }));
              }}
              aria-invalid={errors.date ? true : undefined}
              aria-describedby={errors.date ? "meet-date-err" : undefined}
              className={`${fieldClass} ${errors.date ? "!border-danger/80" : ""}`}
            />
            {errors.date && (
              <p id="meet-date-err" className="mt-1.5 px-1 text-sm text-[#ff9bb0]">
                {errors.date}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="meet-time" className="mb-1.5 block text-sm font-medium text-muted">
              {SCHEDULE.time}
            </label>
            <input
              id="meet-time"
              type="time"
              value={time}
              disabled={busy}
              onChange={(e) => {
                setTime(e.target.value);
                setErrors((x) => ({ ...x, time: undefined }));
              }}
              aria-invalid={errors.time ? true : undefined}
              aria-describedby={errors.time ? "meet-time-err" : undefined}
              className={`${fieldClass} ${errors.time ? "!border-danger/80" : ""}`}
            />
            {errors.time && (
              <p id="meet-time-err" className="mt-1.5 px-1 text-sm text-[#ff9bb0]">
                {errors.time}
              </p>
            )}
          </div>
          <p className="px-1 text-sm text-faint">
            {SCHEDULE.zone}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button type="button" onClick={book} disabled={busy} aria-busy={busy} className="btn-cta h-14 w-full px-6 text-base sm:text-lg">
            {busy ? SCHEDULE.booking : SCHEDULE.book}
          </button>
          <button
            type="button"
            onClick={onDecline}
            disabled={busy}
            className="h-12 w-full rounded-full border border-white/20 px-6 text-base font-semibold text-text transition-colors hover:border-white/45 hover:bg-white/5 disabled:cursor-progress disabled:opacity-60"
          >
            {SCHEDULE.decline}
          </button>
        </div>
        <p role="alert" className={`mt-3 text-center text-sm text-[#ff9bb0] ${error ? "" : "sr-only"}`}>
          {error ?? ""}
        </p>
      </motion.div>
    </motion.div>
  );
}
