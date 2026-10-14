import { randomUUID } from "node:crypto";
import { formatMeeting, meetingStartMs, MEETING_MINUTES, type Meeting } from "./schedule";
import { accent, button, detailPanel, emailShell, esc, link, note, para, strong } from "./emailTheme";
import { deliver, fromEmail as mailFrom, fromName as mailName, mailConfigured } from "./mailer";
import type { LeadPayload } from "./validation";

/** Server-only: builds the confirmation e-mails; lib/mailer.ts sends them (Gmail API). */


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

  const html = meeting
    ? emailShell({
        heading: `Your meeting is ${accent("booked")}`,
        preheader: `Your call is booked for ${when}`,
        body:
          para(`Hi ${name}, thank you for your interest in MS Growth Engine. Here are the details of your call with the iSN team.`) +
          detailPanel([
            ["When", esc(when!)],
            ["Duration", `${MEETING_MINUTES} minutes`],
            ["Meeting link", link(url!)],
          ]) +
          button(url!, "Join meeting") +
          note("A calendar invite is attached to this email."),
        footer: "You received this email because you requested a call on our website.",
      })
    : emailShell({
        heading: accent("Thank you."),
        preheader: "We have received your details",
        body: para(`Hi ${name},`) + `<div style="height:10px"></div>` + para(`We have received your details for ${strong(company)} and a member of the iSN team will be in touch shortly.`),
        footer: "You received this email because you submitted the contact form on our website.",
      });

  const ok = await deliver({
    to: { email: lead.email, name: lead.name },
    // the iSN team is cc'd on every visitor confirmation (skipped when it is the recipient itself)
    cc: teamCc(lead.email),
    from: { email: fromEmail, name: mailName() },
    subject,
    text,
    html,
    ics: meeting && url ? { filename: "ms-growth-engine-call.ics", content: buildIcs(lead, meeting, url, fromEmail) } : undefined,
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

  const html = emailShell({
    heading: `A call has been ${accent("booked")}`,
    preheader: `${lead.name} (${lead.company}) booked ${when}`,
    body:
      para(`${strong(esc(lead.name))} from ${strong(esc(lead.company))} booked a call through the website.`) +
      detailPanel([
        ["When", esc(when)],
        ["Duration", `${MEETING_MINUTES} minutes`],
        ["Meeting link", link(url)],
      ]) +
      detailPanel(
        [
          ["Name", esc(lead.name)],
          ["Company", esc(lead.company)],
          ["Website", esc(lead.website)],
          ["Phone", esc(lead.phone)],
          ["Email", `<a href="mailto:${esc(lead.email)}" style="color:#ffc4a0">${esc(lead.email)}</a>`],
        ],
        { compact: true },
      ) +
      button(url, "Join meeting"),
    footer: "Internal notice: a visitor booked a call on the MS Growth Engine website.",
  });

  return deliver({
    to: { email: to },
    from: { email: fromEmail, name: mailName() },
    replyTo: { email: lead.email, name: lead.name },
    subject,
    text,
    html,
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

  const html = emailShell({
    heading: `You have a booking ${accent("tomorrow")}`,
    preheader: `Reminder: your call is ${when}`,
    body:
      para(`Hi ${esc(name)}, this is a reminder about your call with the iSN team.`) +
      detailPanel([
        ["When", esc(when)],
        ["Duration", `${MEETING_MINUTES} minutes`],
        ["Meeting link", link(meetingUrl)],
      ]) +
      button(meetingUrl, "Join meeting") +
      note("Need to change the time? Just reply to this email."),
    footer: "You received this email because you booked a call on our website.",
  });

  return deliver({
    to: { email: who.email, name: who.name },
    from: { email: fromEmail, name: mailName() },
    replyTo: { email: fromEmail },
    subject,
    text,
    html,
  });
}
