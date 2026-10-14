"use client";

import { useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import RevealHeading from "@/components/ui/RevealHeading";
import MagneticWrap from "@/components/ui/MagneticWrap";
import SectionNumber from "@/components/ui/SectionNumber";
import FloatingField from "@/components/form/FloatingField";
import SuccessState from "@/components/form/SuccessState";
import ScheduleModal from "@/components/form/ScheduleModal";
import { FormScene } from "@/components/three/lazy";
import { setFormProgress } from "@/components/three/progress";
import { submitLead } from "@/lib/submitLead";
import { SlotTakenError, submitSchedule } from "@/lib/submitSchedule";
import { formatMeeting, type Meeting } from "@/lib/schedule";
import { FIELD_ORDER, formatUsPhone, validateField, validateLead, type LeadErrors, type LeadPayload } from "@/lib/validation";
import { FORM, SCHEDULE } from "@/content/copy";

type Status = "idle" | "submitting" | "schedule" | "success" | "error";
type Touched = Partial<Record<keyof LeadPayload, boolean>>;

const EMPTY: LeadPayload = { name: "", company: "", website: "", phone: "", email: "" };

const FIELD_PROPS = {
  name: { label: FORM.fields.name, type: "text", autoComplete: "name" },
  company: { label: FORM.fields.company, type: "text", autoComplete: "organization" },
  website: { label: FORM.fields.website, type: "text", autoComplete: "url", inputMode: "url" as const },
  phone: { label: FORM.fields.phone, type: "tel", autoComplete: "tel", inputMode: "tel" as const },
  email: { label: FORM.fields.email, type: "email", autoComplete: "email", inputMode: "email" as const },
} as const;

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 animate-spin" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.28" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Share of fields that currently pass validation, 0..1 (drives the engine spin). */
function completion(values: LeadPayload) {
  const ok = FIELD_ORDER.filter((f) => !validateField(f, values[f])).length;
  return ok / FIELD_ORDER.length;
}

export default function Contact() {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<LeadPayload>(EMPTY);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [touched, setTouched] = useState<Touched>({});
  const [status, setStatus] = useState<Status>("idle");
  const [sending, setSending] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [note, setNote] = useState<string | undefined>();

  const setError = (field: keyof LeadPayload, message: string | undefined) =>
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });

  const handleChange = (field: keyof LeadPayload, raw: string) => {
    const value = field === "phone" ? formatUsPhone(raw) : raw;
    const next = { ...values, [field]: value };
    setValues(next);
    setFormProgress(completion(next));
    // once a field has been visited, re-validate live as the user types
    if (touched[field]) setError(field, validateField(field, value));
    if (status === "error") setStatus("idle");
  };

  const handleBlur = (field: keyof LeadPayload) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setError(field, validateField(field, values[field]));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "submitting") return;

    const found = validateLead(values);
    setTouched({ name: true, company: true, website: true, phone: true, email: true });
    setErrors(found);
    const firstInvalid = FIELD_ORDER.find((f) => found[f]);
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLInputElement>(`#lead-${firstInvalid}`)?.focus();
      return;
    }

    setStatus("submitting");
    try {
      await submitLead(values);
      setStatus("schedule"); // next: offer to book a call
    } catch {
      setStatus("error");
    }
  };

  // step two: book a call (meeting) or decline (null); the server sends the matching confirmation e-mail
  const finishSchedule = async (meeting: Meeting | null) => {
    if (sending) return;
    setSending(true);
    setScheduleError(null);
    try {
      const result = await submitSchedule(values, meeting);
      setNote(
        result.booked
          ? `${SCHEDULE.bookedNote} ${formatMeeting(meeting!)}.`
          : result.emailed
            ? SCHEDULE.emailedNote
            : undefined,
      );
      setFormProgress(1.6); // the engine revs up for the celebration
      setStatus("success");
    } catch (err) {
      setScheduleError(err instanceof SlotTakenError ? SCHEDULE.slotTaken : SCHEDULE.error);
    } finally {
      setSending(false);
    }
  };

  const busy = status === "submitting" || status === "schedule";

  return (
    <section
      id="build"
      tabIndex={-1}
      aria-labelledby="build-title"
      className="relative overflow-hidden px-5 py-28 outline-none sm:px-8 sm:py-40"
    >
      {/* a calmer copy of the hero engine behind the form */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.55] [mask-image:radial-gradient(ellipse_90%_85%_at_62%_50%,#000_40%,transparent_92%)]">
        <FormScene />
      </div>
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[70vw] max-h-[900px] w-[70vw] max-w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(212_163_115/0.16),transparent_70%)]" />
      <div aria-hidden className="scrim-left pointer-events-none absolute inset-y-0 left-0 w-full lg:w-[55%]" />
      <SectionNumber n="05" className="right-2 top-6 sm:right-10" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1fr_1.02fr] lg:gap-20">
        <div>
          <RevealHeading
            as="h2"
            id="build-title"
            text={FORM.headline}
            highlight={FORM.headlineHighlight}
            className="font-display text-[clamp(2.2rem,4.8vw,4.4rem)] font-bold leading-[1.03] text-white"
          />
          <p className="mt-7 max-w-xl text-base leading-relaxed text-text/90 sm:text-lg">{FORM.body}</p>
        </div>

        <div className="relative">
          <div aria-hidden className="absolute -inset-4 rounded-[2.4rem] bg-gradient-to-br from-blue/25 via-violet/20 to-cyan/20 blur-3xl" />
          <div className="gborder gborder-live relative rounded-[2rem]">
            <div className="glass absolute inset-0 rounded-[inherit] bg-ink-900/60" />
            <div className="relative z-10 p-6 sm:p-9">
              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <SuccessState key="success" note={note} />
                ) : (
                  <motion.form
                    key="form"
                    ref={formRef}
                    noValidate
                    onSubmit={handleSubmit}
                    aria-label={FORM.headline}
                    exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col gap-4"
                  >
                    {FIELD_ORDER.map((field) => (
                      <FloatingField
                        key={field}
                        id={`lead-${field}`}
                        name={field}
                        value={values[field]}
                        error={errors[field]}
                        touched={touched[field]}
                        disabled={busy}
                        onChange={(v) => handleChange(field, v)}
                        onBlur={() => handleBlur(field)}
                        {...FIELD_PROPS[field]}
                      />
                    ))}

                    <div className="mt-3">
                      <MagneticWrap block strength={0.14}>
                        {/* the button morphs into a round loader while the request is in flight */}
                        <motion.button
                          type="submit"
                          disabled={busy}
                          aria-busy={busy}
                          animate={{ width: busy ? 64 : "100%" }}
                          transition={{ type: "spring", stiffness: 260, damping: 26 }}
                          className="btn-cta btn-pulse mx-auto h-16 max-w-full px-0 text-[0.95rem] sm:text-lg"
                          style={{ display: "flex" }}
                        >
                          {busy ? (
                            <>
                              <Spinner />
                              <span className="sr-only">Sending your details</span>
                            </>
                          ) : (
                            <span className="whitespace-nowrap px-6">{FORM.submit}</span>
                          )}
                        </motion.button>
                      </MagneticWrap>
                    </div>

                    <p role="alert" className={`text-center text-sm text-[#ff9bb0] transition-opacity ${status === "error" ? "opacity-100" : "h-0 overflow-hidden opacity-0"}`}>
                      {status === "error" ? FORM.error : ""}
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {status === "schedule" && (
          <ScheduleModal
            key="schedule"
            busy={sending}
            error={scheduleError}
            onBook={(m) => void finishSchedule(m)}
            onDecline={() => void finishSchedule(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
