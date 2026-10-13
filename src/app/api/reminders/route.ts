import { NextResponse } from "next/server";
import { sendReminderEmail } from "@/lib/confirmationEmail";
import { googleConfigured, listBookings, markReminded } from "@/lib/googleCalendar";
import { meetingFromMs } from "@/lib/schedule";

/**
 * Day-before reminder job. Call it once an hour (Render Cron Job, cron-job.org, ...):
 *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<your-site>/api/reminders
 *
 * Google Calendar is the source of truth: every website booking carries a private tag, so the job finds
 * bookings that start within the next 24 hours, e-mails the attendee "you have a booking tomorrow" and tags
 * the event so it is never reminded twice. Bookings made less than 24 hours ahead are skipped (the
 * confirmation mail was just sent). Needs CRON_SECRET; without it the endpoint is disabled.
 *
 * Testing only: ?windowHours=N&minLeadHours=M override the 24 / 24 defaults.
 */
async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new NextResponse("Not enabled.", { status: 404 });
  const url = new URL(request.url);
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("key");
  if (given !== secret) return new NextResponse("Unauthorized.", { status: 401 });
  if (!googleConfigured()) return NextResponse.json({ ok: false, error: "Google Calendar is not configured." }, { status: 503 });

  const num = (k: string, d: number) => {
    const v = Number(url.searchParams.get(k));
    return url.searchParams.has(k) && Number.isFinite(v) ? v : d;
  };
  const windowMs = num("windowHours", 24) * 3600_000;
  const minLeadMs = num("minLeadHours", 24) * 3600_000;
  const now = Date.now();

  const bookings = await listBookings(now, now + windowMs);
  if (!bookings) return NextResponse.json({ ok: false, error: "Could not read the calendar." }, { status: 502 });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const b of bookings) {
    // already reminded, nobody to e-mail, or booked at short notice (no day-before reminder needed)
    if (b.reminded || !b.attendee || !b.meetUrl || b.startMs - b.createdMs < minLeadMs) {
      skipped++;
      continue;
    }
    const ok = await sendReminderEmail(b.attendee, meetingFromMs(b.startMs), b.meetUrl);
    if (ok) {
      await markReminded(b.id);
      sent++;
    } else {
      failed++; // not marked, so the next hourly run retries
    }
  }
  return NextResponse.json({ ok: true, checked: bookings.length, sent, skipped, failed });
}

export const GET = run;
export const POST = run;
