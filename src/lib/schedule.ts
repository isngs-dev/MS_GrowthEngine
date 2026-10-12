/**
 * Meeting-request helpers shared by the browser (inline validation) and the API route.
 * A meeting is the local wall-clock date + time the visitor picked, plus their IANA time zone.
 */

export type Meeting = {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM (24h) */
  time: string;
  /** IANA zone, e.g. "Africa/Lagos" */
  timeZone: string;
};

export type MeetingErrors = Partial<Record<"date" | "time", string>>;

export const MEETING_MINUTES = 30;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Offset (ms) of `timeZone` from UTC at the instant `utcMs`. */
function zoneOffset(utcMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** The UTC instant (ms) at which the wall clock in `timeZone` reads `date` `time`. */
export function meetingStartMs(m: Meeting) {
  const [y, mo, d] = m.date.split("-").map(Number);
  const [h, mi] = m.time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let utc = guess - zoneOffset(guess, m.timeZone);
  utc = guess - zoneOffset(utc, m.timeZone); // second pass settles DST edges
  return utc;
}

export function validateMeeting(m: Partial<Meeting>, now = Date.now()): MeetingErrors {
  const errors: MeetingErrors = {};
  if (!m.date || !DATE_RE.test(m.date)) errors.date = "Please choose a date.";
  if (!m.time || !TIME_RE.test(m.time)) errors.time = "Please choose a time.";
  else if (!SLOT_TIMES.includes(m.time)) errors.time = "Please choose one of the available times.";
  if (errors.date || errors.time) return errors;
  const tz = m.timeZone && isValidTimeZone(m.timeZone) ? m.timeZone : "UTC";
  const start = meetingStartMs({ date: m.date!, time: m.time!, timeZone: tz });
  if (Number.isNaN(start)) errors.date = "Please choose a valid date.";
  else if (start < now + 15 * 60 * 1000) errors.time = "Please choose a time in the future.";
  else if (start > now + 366 * 24 * 60 * 60 * 1000) errors.date = "Please choose a date within the next year.";
  return errors;
}

/** Calls are always scheduled in US Eastern Time (EST in winter, EDT in summer). */
export const MEETING_TIME_ZONE = "America/New_York";

/** Today's date (YYYY-MM-DD) in the meeting time zone. */
export function todayInMeetingZone(now = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MEETING_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** "Wednesday, October 14, 2026 at 3:30 PM EDT" */
export function formatMeeting(m: Meeting) {
  const start = new Date(meetingStartMs(m));
  const day = new Intl.DateTimeFormat("en-US", { timeZone: m.timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(start);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: m.timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(start);
  return `${day} at ${time}`;
}

/** Bookable start times (Eastern Time): 9:00 AM to 5:30 PM in 30 minute slots. */
export const SLOT_TIMES: string[] = Array.from({ length: 18 }, (_, i) => {
  const mins = 9 * 60 + i * 30;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});

/** "13:30" -> "1:30 PM" */
export function slotLabel(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** The calendar day after a YYYY-MM-DD string. */
export function nextDate(date: string) {
  const [y, mo, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d + 1)).toISOString().slice(0, 10);
}

export type Slot = { time: string; available: boolean };
