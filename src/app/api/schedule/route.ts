import { NextResponse } from "next/server";
import { sendConfirmationEmail, sendTeamBookingNotice } from "@/lib/confirmationEmail";
import { createMeetEvent, googleConfigured } from "@/lib/googleCalendar";
import { MEETING_TIME_ZONE, validateMeeting, type Meeting } from "@/lib/schedule";
import { normalizeLead, validateLead, type LeadPayload } from "@/lib/validation";

/**
 * Second step after the contact form: the visitor either books a call or declines.
 *  - booked  -> confirmation e-mail with the meeting link + calendar invite
 *  - declined -> normal confirmation e-mail
 * A booked call also creates a Google Calendar event with a Meet link (lib/googleCalendar.ts).
 * E-mail goes out through SendGrid (SENDGRID_API_KEY + SENDGRID_FROM_EMAIL, see .env.example).
 * If SendGrid is not configured the request still succeeds and `emailed` is false.
 */
export async function POST(request: Request) {
  let body: { lead?: Partial<LeadPayload>; meeting?: Partial<Meeting> | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const input = body.lead ?? {};
  const lead = normalizeLead({
    name: String(input.name ?? ""),
    company: String(input.company ?? ""),
    website: String(input.website ?? ""),
    phone: String(input.phone ?? ""),
    email: String(input.email ?? ""),
  });
  const leadErrors = validateLead(lead);
  if (Object.keys(leadErrors).length > 0) {
    return NextResponse.json({ ok: false, errors: leadErrors }, { status: 422 });
  }

  let meeting: Meeting | undefined;
  if (body.meeting) {
    const m = body.meeting;
    // calls are always booked in Eastern Time, whatever the client sends
    const candidate = { date: String(m.date ?? ""), time: String(m.time ?? ""), timeZone: MEETING_TIME_ZONE };
    const errors = validateMeeting(candidate);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ ok: false, meetingErrors: errors }, { status: 422 });
    }
    meeting = candidate;
  }

  // booked call: create the Google Calendar event + Meet link (falls back to a generated room if Calendar is
  // not configured or its API fails, so the visitor still gets a working link)
  let meetUrl: string | undefined;
  let calendar = false;
  if (meeting && googleConfigured()) {
    const event = await createMeetEvent(lead, meeting);
    if (event.status === "conflict") {
      return NextResponse.json({ ok: false, conflict: true }, { status: 409 });
    }
    if (event.status === "created") {
      meetUrl = event.meetUrl;
      calendar = true;
    }
  }

  const result = await sendConfirmationEmail(lead, meeting, meetUrl);

  // tell the iSN team (TEAM_NOTIFY_EMAIL, default kaustubh.b1@isngs.com) that a call was booked,
  // using the same meeting link the visitor received
  if (meeting) await sendTeamBookingNotice(lead, meeting, result.meetingUrl ?? meetUrl);

  // let the CRM / automation know whether a call was booked (same webhook as /api/lead)
  const webhook = process.env.LEAD_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: meeting ? "meeting_booked" : "no_meeting",
          ...lead,
          meeting: meeting ?? null,
          meetingUrl: result.meetingUrl ?? null,
          source: "ms-growth-engine-landing",
          receivedAt: new Date().toISOString(),
        }),
      });
    } catch {
      // the visitor's flow must not fail because the CRM hook did
    }
  }

  return NextResponse.json({ ok: true, booked: !!meeting, emailed: result.sent, calendar });
}
