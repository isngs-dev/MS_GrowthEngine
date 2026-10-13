import { randomUUID } from "node:crypto";
import { formatMeeting, meetingStartMs, MEETING_MINUTES, type Meeting } from "./schedule";
import { deliver, fromEmail as mailFrom, mailConfigured } from "./mailer";
import type { LeadPayload } from "./validation";

/** Server-only: builds the confirmation e-mails; lib/mailer.ts sends them (Gmail API or SendGrid). */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Address cc'd on the visitor's confirmation (TEAM_NOTIFY_EMAIL, default kaustubh.b1@isngs.com). */
function teamCc(recipient: string) {
  const cc = process.env.TEAM_NOTIFY_EMAIL || "kaustubh.b1@isngs.com";
  return cc.toLowerCase() === recipient.toLowerCase() ? undefined : cc;
}

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
    `ORGANIZER;CN=MS Growth Engine:mailto:${fromEmail}`,
    `ATTENDEE;CN=${lead.name.replace(/[;,:"]/g, " ")}:mailto:${lead.email}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** `meetingUrl` is the Google Meet link when Calendar is connected; otherwise a fallback room is generated. */
export async function sendConfirmationEmail(lead: LeadPayload, meeting?: Meeting, meetingUrl?: string): Promise<SendResult> {
  if (!mailConfigured()) return { sent: false, reason: "not-configured" };
  const fromEmail = mailFrom()!;

  const fromName = process.env.SENDGRID_FROM_NAME || "MS Growth Engine";
  const name = esc(lead.name);
  const company = esc(lead.company);
  const url = meeting ? meetingUrl ?? newMeetingUrl() : undefined;
  const when = meeting ? formatMeeting(meeting) : undefined; // already includes the zone, e.g. "3:30 PM EDT"

  const subject = meeting ? "Your MS Growth Engine meeting is booked" : "Thank you for contacting MS Growth Engine";
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
    `<tr><td style="padding:0 0 18px"><div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#a08a78;padding-bottom:4px">${label}</div><div style="font-size:17px;font-weight:700;color:#f6ece0">${value}</div></td></tr>`;

  const details = meeting
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#3a281b;border:1px solid #4d3626;border-radius:14px;margin:22px 0 8px"><tr><td style="padding:22px 24px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row("When", esc(when!))}
${row("Duration", `${MEETING_MINUTES} minutes`)}
${row("Meeting link", `<a href="${esc(url!)}" style="color:#ffc4a0">${esc(url!)}</a>`)}
</table></td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 6px"><tr><td style="background:#ffc4a0;border-radius:999px"><a href="${esc(url!)}" style="display:inline-block;padding:14px 30px;color:#2a160c;font-size:16px;font-weight:700;text-decoration:none">Join meeting</a></td></tr></table>
<p style="margin:16px 0 0;font-size:14px;color:#a08a78">A calendar invite is attached to this email.</p>`
    : `<p style="margin:0;font-size:16px;line-height:1.6;color:#cdb9a5">We have received your details for <strong style="color:#f6ece0">${company}</strong> and a member of the iSN team will be in touch shortly.</p>`;

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#1a120d" bgcolor="#1a120d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#1a120d" style="background:#1a120d"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:Arial,Helvetica,sans-serif">
<tr><td style="padding:0 4px 18px;font-size:22px;color:#f6ece0"><span style="background:#fbefe3;border-radius:6px;padding:3px 10px;color:#2f5bd0;font-style:italic;font-weight:700">iSN</span><span style="color:#6b4c38"> &nbsp;|&nbsp; </span><span style="font-weight:700">MS Growth Engine</span></td></tr>
<tr><td bgcolor="#2a1c13" style="background:#2a1c13;border:1px solid #4d3626;border-radius:24px;padding:34px 32px">
<h1 style="margin:0 0 14px;font-size:30px;line-height:1.2;color:#f6ece0">${meeting ? "Your meeting is booked" : "Thank you."}</h1>
<p style="margin:0 0 6px;font-size:16px;line-height:1.6;color:#cdb9a5">Hi ${name},${meeting ? " thank you for your interest in MS Growth Engine. Here are the details of your call with the iSN team." : ""}</p>
${details}
</td></tr>
<tr><td style="padding:20px 8px 0;font-size:12px;line-height:1.6;color:#a08a78;text-align:center">iSN Business Solutions &middot; <a href="${site}" style="color:#ffc4a0">www.isngs.com</a><br/>You received this email because you ${meeting ? "requested a call" : "submitted the contact form"} on our website.</td></tr>
</table></td></tr></table></body></html>`;

  const ok = await deliver({
    to: { email: lead.email, name: lead.name },
    // the iSN team is cc'd on every visitor confirmation (skipped when it is the recipient itself)
    cc: teamCc(lead.email),
    from: { email: fromEmail, name: fromName },
    subject,
    text,
    html,
    ics: meeting && url ? { filename: "ms-growth-engine-call.ics", content: buildIcs(lead, meeting, url, fromEmail) } : undefined,
    category: "ms-growth-engine-confirmation",
  });
  return ok ? { sent: true, meetingUrl: url } : { sent: false, reason: "failed" };
}

/** Internal heads-up for the iSN team: someone booked a call. Goes to TEAM_NOTIFY_EMAIL (default below). */
export async function sendTeamBookingNotice(lead: LeadPayload, meeting: Meeting, meetingUrl?: string): Promise<boolean> {
  if (!mailConfigured()) return false;
  const fromEmail = mailFrom()!;

  const to = process.env.TEAM_NOTIFY_EMAIL || "kaustubh.b1@isngs.com";
  const url = meetingUrl ?? newMeetingUrl();
  const when = formatMeeting(meeting);

  const subject = `New call booked: ${lead.name} (${lead.company})`;
  const text = `${lead.name} from ${lead.company} has booked a call.

When: ${when}
Duration: ${MEETING_MINUTES} minutes
Meeting link: ${url}

Name: ${lead.name}
Company: ${lead.company}
Website: ${lead.website}
Phone: ${lead.phone}
Email: ${lead.email}`;

  const row = (label: string, value: string) =>
    `<tr><td style="padding:0 16px 10px 0;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#a08a78;white-space:nowrap">${label}</td><td style="padding:0 0 10px;font-size:15px;color:#f6ece0">${value}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#1a120d" bgcolor="#1a120d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#1a120d" style="background:#1a120d"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:Arial,Helvetica,sans-serif">
<tr><td style="padding:0 4px 18px;font-size:22px;color:#f6ece0"><span style="background:#fbefe3;border-radius:6px;padding:3px 10px;color:#2f5bd0;font-style:italic;font-weight:700">iSN</span><span style="color:#6b4c38"> &nbsp;|&nbsp; </span><span style="font-weight:700">MS Growth Engine</span></td></tr>
<tr><td bgcolor="#2a1c13" style="background:#2a1c13;border:1px solid #4d3626;border-radius:24px;padding:34px 32px">
<h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#f6ece0">A call has been booked</h1>
<p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#cdb9a5"><strong style="color:#f6ece0">${esc(lead.name)}</strong> from <strong style="color:#f6ece0">${esc(lead.company)}</strong> booked a call through the website.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#3a281b;border:1px solid #4d3626;border-radius:14px"><tr><td style="padding:20px 22px 10px"><table role="presentation" cellpadding="0" cellspacing="0">
${row("When", esc(when))}
${row("Duration", `${MEETING_MINUTES} minutes`)}
${row("Meeting link", `<a href="${esc(url)}" style="color:#ffc4a0">${esc(url)}</a>`)}
</table></td></tr></table>
<p style="margin:22px 0 8px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#a08a78">Contact details</p>
<table role="presentation" cellpadding="0" cellspacing="0">
${row("Name", esc(lead.name))}
${row("Company", esc(lead.company))}
${row("Website", esc(lead.website))}
${row("Phone", esc(lead.phone))}
${row("Email", `<a href="mailto:${esc(lead.email)}" style="color:#ffc4a0">${esc(lead.email)}</a>`)}
</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 0"><tr><td style="background:#ffc4a0;border-radius:999px"><a href="${esc(url)}" style="display:inline-block;padding:14px 30px;color:#2a160c;font-size:16px;font-weight:700;text-decoration:none">Join meeting</a></td></tr></table>
</td></tr>
</table></td></tr></table></body></html>`;

  return deliver({
    to: { email: to },
    from: { email: fromEmail, name: process.env.SENDGRID_FROM_NAME || "MS Growth Engine" },
    replyTo: { email: lead.email, name: lead.name },
    subject,
    text,
    html,
    category: "ms-growth-engine-team-notice",
  });
}

/** "Your call is tomorrow" reminder, sent about 24 hours before a booked call. */
export async function sendReminderEmail(who: { name?: string; email: string }, meeting: Meeting, meetingUrl: string): Promise<boolean> {
  if (!mailConfigured()) return false;
  const fromEmail = mailFrom()!;
  const name = who.name?.trim() || "there";
  const when = formatMeeting(meeting);
  const site = "https://www.isngs.com/";

  const subject = "Reminder: you have a call tomorrow with MS Growth Engine";
  const text = `Hi ${name},

This is a reminder that you have a booking tomorrow.

When: ${when}
Duration: ${MEETING_MINUTES} minutes
Meeting link: ${meetingUrl}

If you need to change the time, just reply to this email.

iSN Business Solutions
${site}`;

  const row = (label: string, value: string) =>
    `<tr><td style="padding:0 0 18px"><div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#a08a78;padding-bottom:4px">${label}</div><div style="font-size:17px;font-weight:700;color:#f6ece0">${value}</div></td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#1a120d" bgcolor="#1a120d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#1a120d" style="background:#1a120d"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:Arial,Helvetica,sans-serif">
<tr><td style="padding:0 4px 18px;font-size:22px;color:#f6ece0"><span style="background:#fbefe3;border-radius:6px;padding:3px 10px;color:#2f5bd0;font-style:italic;font-weight:700">iSN</span><span style="color:#6b4c38"> &nbsp;|&nbsp; </span><span style="font-weight:700">MS Growth Engine</span></td></tr>
<tr><td bgcolor="#2a1c13" style="background:#2a1c13;border:1px solid #4d3626;border-radius:24px;padding:34px 32px">
<h1 style="margin:0 0 14px;font-size:30px;line-height:1.2;color:#f6ece0">You have a booking tomorrow</h1>
<p style="margin:0 0 6px;font-size:16px;line-height:1.6;color:#cdb9a5">Hi ${esc(name)}, this is a reminder about your call with the iSN team.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#3a281b;border:1px solid #4d3626;border-radius:14px;margin:22px 0 8px"><tr><td style="padding:22px 24px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row("When", esc(when))}
${row("Duration", `${MEETING_MINUTES} minutes`)}
${row("Meeting link", `<a href="${esc(meetingUrl)}" style="color:#ffc4a0">${esc(meetingUrl)}</a>`)}
</table></td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 6px"><tr><td style="background:#ffc4a0;border-radius:999px"><a href="${esc(meetingUrl)}" style="display:inline-block;padding:14px 30px;color:#2a160c;font-size:16px;font-weight:700;text-decoration:none">Join meeting</a></td></tr></table>
<p style="margin:16px 0 0;font-size:14px;color:#a08a78">Need to change the time? Just reply to this email.</p>
</td></tr>
<tr><td style="padding:20px 8px 0;font-size:12px;line-height:1.6;color:#a08a78;text-align:center">iSN Business Solutions &middot; <a href="${site}" style="color:#ffc4a0">www.isngs.com</a><br/>You received this email because you booked a call on our website.</td></tr>
</table></td></tr></table></body></html>`;

  return deliver({
    to: { email: who.email, name: who.name },
    from: { email: fromEmail, name: process.env.SENDGRID_FROM_NAME || "MS Growth Engine" },
    replyTo: { email: fromEmail },
    subject,
    text,
    html,
    category: "ms-growth-engine-reminder",
  });
}
