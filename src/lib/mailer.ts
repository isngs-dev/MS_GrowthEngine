import { getGoogleAccessToken, googleConfigured } from "./googleCalendar";

/**
 * Server-only mail transport. Two ways to send, same message:
 *  - Gmail API (MAIL_TRANSPORT=gmail): sent from your Google Workspace mailbox, which lands in inboxes far
 *    more reliably than a shared SendGrid IP. Needs the gmail.send scope on GOOGLE_REFRESH_TOKEN and
 *    SENDGRID_FROM_EMAIL (or MAIL_FROM_EMAIL) set up as a "Send mail as" alias of that mailbox.
 *  - SendGrid: used when Gmail is not enabled, and as a fallback if the Gmail send fails.
 */

export type Outgoing = {
  to: { email: string; name?: string };
  cc?: string;
  from: { email: string; name: string };
  replyTo?: { email: string; name?: string };
  subject: string;
  text: string;
  html: string;
  /** calendar invite attached as .ics */
  ics?: { filename: string; content: string };
  category: string;
};

export function fromEmail() {
  return process.env.MAIL_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL;
}

const gmailEnabled = () => process.env.MAIL_TRANSPORT === "gmail" && googleConfigured();
const sendgridEnabled = () => !!(process.env.SENDGRID_API_KEY && fromEmail());

export function mailConfigured() {
  return !!fromEmail() && (gmailEnabled() || sendgridEnabled());
}

/* ---------------------------------- Gmail --------------------------------- */

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const wrap = (b: string) => b.replace(/(.{76})/g, "$1\r\n");
/** RFC 2047 encoded-word, so non-ASCII names / subjects survive */
const word = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);
const addr = (a: { email: string; name?: string }) => (a.name ? `${word(a.name.replace(/["\r\n]/g, ""))} <${a.email}>` : a.email);

function buildMime(m: Outgoing) {
  const id = Math.random().toString(36).slice(2);
  const alt = `alt_${id}`;
  const mixed = `mix_${id}`;
  const headers = [
    `From: ${addr(m.from)}`,
    `To: ${addr(m.to)}`,
    ...(m.cc ? [`Cc: ${m.cc}`] : []),
    ...(m.replyTo ? [`Reply-To: ${addr(m.replyTo)}`] : []),
    `Subject: ${word(m.subject)}`,
    "MIME-Version: 1.0",
  ];
  const part = (type: string, body: string) =>
    `Content-Type: ${type}; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap(b64(body))}\r\n`;
  const alternative =
    `Content-Type: multipart/alternative; boundary="${alt}"\r\n\r\n` +
    `--${alt}\r\n${part("text/plain", m.text)}` +
    `--${alt}\r\n${part("text/html", m.html)}` +
    `--${alt}--\r\n`;

  if (!m.ics) return `${headers.join("\r\n")}\r\n${alternative}`;
  return (
    `${headers.join("\r\n")}\r\nContent-Type: multipart/mixed; boundary="${mixed}"\r\n\r\n` +
    `--${mixed}\r\n${alternative}\r\n` +
    `--${mixed}\r\nContent-Type: text/calendar; method=PUBLISH; name="${m.ics.filename}"\r\n` +
    `Content-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="${m.ics.filename}"\r\n\r\n${wrap(b64(m.ics.content))}\r\n` +
    `--${mixed}--\r\n`
  );
}

async function sendGmail(m: Outgoing) {
  try {
    const token = await getGoogleAccessToken();
    const raw = Buffer.from(buildMime(m), "utf8").toString("base64url");
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      console.error("[mailer] Gmail send failed:", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[mailer] Gmail send failed:", err instanceof Error ? err.message : "error");
    return false;
  }
}

/* -------------------------------- SendGrid -------------------------------- */

async function sendSendGrid(m: Outgoing) {
  const body: Record<string, unknown> = {
    personalizations: [
      { to: [{ email: m.to.email, ...(m.to.name ? { name: m.to.name } : {}) }], ...(m.cc ? { cc: [{ email: m.cc }] } : {}) },
    ],
    from: m.from,
    ...(m.replyTo ? { reply_to: m.replyTo } : {}),
    subject: m.subject,
    // plain links (no click-tracking redirect) and no tracking pixel look far less like marketing mail
    tracking_settings: { click_tracking: { enable: false, enable_text: false }, open_tracking: { enable: false } },
    categories: [m.category],
    content: [
      { type: "text/plain", value: m.text },
      { type: "text/html", value: m.html },
    ],
    ...(m.ics
      ? {
          attachments: [
            {
              content: Buffer.from(m.ics.content).toString("base64"),
              type: "text/calendar; method=PUBLISH",
              filename: m.ics.filename,
              disposition: "attachment",
            },
          ],
        }
      : {}),
  };
  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Sends one message. Gmail first when enabled, SendGrid as the fallback. Returns true when accepted. */
export async function deliver(m: Outgoing): Promise<boolean> {
  if (gmailEnabled() && (await sendGmail(m))) return true;
  if (sendgridEnabled()) return sendSendGrid(m);
  return false;
}
