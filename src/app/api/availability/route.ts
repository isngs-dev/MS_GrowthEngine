import { NextResponse } from "next/server";
import { busyForDay, googleConfigured } from "@/lib/googleCalendar";
import { meetingStartMs, MEETING_MINUTES, MEETING_TIME_ZONE, SLOT_TIMES, type Slot } from "@/lib/schedule";

/**
 * GET /api/availability?date=YYYY-MM-DD -> the bookable time slots for that day (Eastern Time).
 * A slot is unavailable when it is (almost) in the past or overlaps an event on the host Google calendar.
 * Without Google Calendar configured only the past-time rule applies.
 */
export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: "Invalid date." }, { status: 400 });
  }
  const dayStart = meetingStartMs({ date, time: "00:00", timeZone: MEETING_TIME_ZONE });
  const now = Date.now();
  if (Number.isNaN(dayStart) || dayStart > now + 366 * 86400_000) {
    return NextResponse.json({ ok: false, error: "Date out of range." }, { status: 400 });
  }

  const busy = googleConfigured() ? await busyForDay(date) : null;
  const slots: Slot[] = SLOT_TIMES.map((time) => {
    const start = meetingStartMs({ date, time, timeZone: MEETING_TIME_ZONE });
    const end = start + MEETING_MINUTES * 60_000;
    let available = start >= now + 15 * 60_000;
    if (available && busy) {
      if (busy.allDay) available = false;
      else if (busy.intervals.some(([s, e]) => s < end && e > start)) available = false;
    }
    return { time, available };
  });
  return NextResponse.json({ ok: true, slots }, { headers: { "Cache-Control": "no-store" } });
}
