import { randomUUID } from "node:crypto";
import { formatMeeting, meetingStartMs, MEETING_MINUTES, type Meeting } from "./schedule";
import type { LeadPayload } from "./validation";

/** Server-only: builds and sends the confirmation e-mail through SendGrid's v3 HTTP API. */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type SendResult = { sent: boolean; reason?: "not-configured" | "failed"; meetingUrl?: string };

/** MEETING_URL if you run a fixed room (Meet / Zoom / Teams); otherwise a unique Jitsi room per booking. */
export function newMeetingUrl() {
  const fixed = process.env.MEETING_URL?.trim();
  return fixed || `https://meet.jit.si/ms-growth-engine-${randomUUID().slice(0, 12)}`;
}

function icsStamp(ms: number) {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildIcs(lead: LeadPayload, meeting: Meeting, url: string, fromEmail: string) {
  const start = meetingStartMs(meeting);
  const end = start + MEETING_MINUTES * 60 * 1000;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//iSN Business Solutions//MS Growth Engine//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${randomUUID()}@ms-growth-engine`,
    `DTSTAMP:${icsStamp(Date.now())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    "SUMMARY:MS Growth Engine: intro call",
    `DESCRIPTION:Meeting link: ${url}`,
    `LOCATION:${url}`,
    `ORGANIZER:mailto:${fromEmail}`,
    `ATTENDEE;CN=${lead.name.replace(/[;,:"]/g, " ")}:mailto:${lead.email}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** `meetingUrl` is the Google Meet link when Calendar is connected; otherwise a fallback room is generated. */
export async function sendConfirmationEmail(lead: LeadPayload, meeting?: Meeting, meetingUrl?: string): Promise<SendResult> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (!apiKey || !fromEmail) return { sent: false, reason: "not-configured" };

  const fromName = process.env.SENDGRID_FROM_NAME || "iSN Business Solutions";
  const name = esc(lead.name);
  const company = esc(lead.company);
  const url = meeting ? meetingUrl ?? newMeetingUrl() : undefined;
  const when = meeting ? formatMeeting(meeting) : undefined; // already includes the zone, e.g. "3:30 PM EDT"

  const subject = meeting ? "Your MS Growth Engine call is booked" : "Thank you. We'll be in touch shortly.";
  const text = meeting
    ? `Hi ${lead.name},\n\nThank you for your interest in MS Growth Engine. Your call is booked.\n\nWhen: ${when}\nMeeting link: ${url}\n\nWe have also attached a calendar invite. We look forward to speaking with you.\n\niSN Business Solutions`
    : `Hi ${lead.name},\n\nThank you. We've received your details for ${lead.company} and we'll be in touch shortly.\n\niSN Business Solutions`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#2a1c13">
  <h2 style="margin:0 0 16px;color:#2a1c13">${meeting ? "Your call is booked" : "Thank you."}</h2>
  <p>Hi ${name},</p>
  ${
    meeting
      ? `<p>Thank you for your interest in MS Growth Engine. Your call with the iSN team is booked.</p>
  <p style="background:#fbefe3;border-radius:10px;padding:14px 16px"><strong>When:</strong> ${esc(when!)}<br/><strong>Meeting link:</strong> <a href="${esc(url!)}">${esc(url!)}</a></p>
  <p>A calendar invite is attached. We look forward to speaking with you.</p>`
      : `<p>We've received your details for <strong>${company}</strong> and we'll be in touch shortly.</p>`
  }
  <p style="margin-top:28px;color:#7a5a45">iSN Business Solutions</p>
</div>`;

  const body: Record<string, unknown> = {
    personalizations: [{ to: [{ email: lead.email, name: lead.name }] }],
    from: { email: fromEmail, name: fromName },
    subject,
    content: [
      { type: "text/plain", value: text },
      { type: "text/html", value: html },
    ],
  };
  if (meeting && url) {
    body.attachments = [
      {
        content: Buffer.from(buildIcs(lead, meeting, url, fromEmail)).toString("base64"),
        type: "text/calendar; method=PUBLISH",
        filename: "ms-growth-engine-call.ics",
        disposition: "attachment",
      },
    ];
  }

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { sent: false, reason: "failed" };
    return { sent: true, meetingUrl: url };
  } catch {
    return { sent: false, reason: "failed" };
  }
}
