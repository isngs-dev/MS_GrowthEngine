import { getGoogleAccessToken, googleConfigured } from "./googleCalendar";

/**
 * Server-only mail transport: the Gmail API, sent from the Google Workspace mailbox behind GOOGLE_REFRESH_TOKEN.
 * Needs the gmail.send scope on that token and MAIL_FROM_EMAIL set up as a "Send mail as" alias of the mailbox.
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
};

export const fromEmail = () => process.env.MAIL_FROM_EMAIL;
export const fromName = () => process.env.MAIL_FROM_NAME || "MS Growth Engine";

export const mailConfigured = () => !!fromEmail() && googleConfigured();

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

/** Sends one message through the Gmail API. Returns true when accepted. */
export const deliver = sendGmail;
