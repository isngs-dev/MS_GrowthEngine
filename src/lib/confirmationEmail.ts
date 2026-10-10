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

  const subject = meeting ? "Your MS Growth Engine meeting is booked" : "Thank you for contacting iSN Business Solutions";
  const site = "https://www.isngs.com/";

  const text = meeting
    ? `Hi ${lead.name},

Thank you for your interest in MS Growth Engine. Here are the details of your call with the iSN team.

When: ${when}
Duration: ${MEETING_MINUTES} minutes
Meeting link: ${url}

A calendar invite is attached to this email.

iSN Business Solutions
${site}

You received this email because you requested a call on our website.`
    : `Hi ${lead.name},

Thank you for your interest in MS Growth Engine. We have received your details for ${lead.company} and a member of the iSN team will be in touch shortly.

iSN Business Solutions
${site}

You received this email because you submitted the contact form on our website.`;

  const row = (label: string, value: string) =>
    `<tr><td style="padding:0 0 18px"><div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7a6a5a;padding-bottom:4px">${label}</div><div style="font-size:17px;font-weight:700;color:#2a1c13">${value}</div></td></tr>`;

  const details = meeting
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f0e6;border-radius:14px;margin:22px 0 8px"><tr><td style="padding:22px 24px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row("When", esc(when!))}
${row("Duration", `${MEETING_MINUTES} minutes`)}
${row("Meeting link", `<a href="${esc(url!)}" style="color:#2a1c13">${esc(url!)}</a>`)}
</table></td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 6px"><tr><td style="background:#2a1c13;border-radius:999px"><a href="${esc(url!)}" style="display:inline-block;padding:14px 30px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none">Join meeting</a></td></tr></table>
<p style="margin:16px 0 0;font-size:14px;color:#7a6a5a">A calendar invite is attached to this email.</p>`
    : `<p style="margin:0;font-size:16px;line-height:1.6;color:#5c4a3b">We have received your details for <strong>${company}</strong> and a member of the iSN team will be in touch shortly.</p>`;

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f5ede1">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5ede1"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:Arial,Helvetica,sans-serif">
<tr><td style="padding:0 4px 18px;font-size:22px;color:#2a1c13"><span style="color:#2f5bd0;font-style:italic;font-weight:700">iSN</span><span style="color:#cdbfae"> &nbsp;|&nbsp; </span><span style="font-weight:700">MS Growth Engine</span></td></tr>
<tr><td style="background:#ffffff;border-radius:24px;padding:34px 32px">
<h1 style="margin:0 0 14px;font-size:30px;line-height:1.2;color:#2a1c13">${meeting ? "Your meeting is booked" : "Thank you."}</h1>
<p style="margin:0 0 6px;font-size:16px;line-height:1.6;color:#5c4a3b">Hi ${name},${meeting ? " thank you for your interest in MS Growth Engine. Here are the details of your call with the iSN team." : ""}</p>
${details}
</td></tr>
<tr><td style="padding:20px 8px 0;font-size:12px;line-height:1.6;color:#8a7a6a;text-align:center">iSN Business Solutions &middot; <a href="${site}" style="color:#8a7a6a">www.isngs.com</a><br/>You received this email because you ${meeting ? "requested a call" : "submitted the contact form"} on our website.</td></tr>
</table></td></tr></table></body></html>`;

  const body: Record<string, unknown> = {
    personalizations: [{ to: [{ email: lead.email, name: lead.name }] }],
    from: { email: fromEmail, name: fromName },
    subject,
    // plain links (no click-tracking redirect) and no tracking pixel look far less like marketing mail
    tracking_settings: { click_tracking: { enable: false, enable_text: false }, open_tracking: { enable: false } },
    categories: ["ms-growth-engine-confirmation"],
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
