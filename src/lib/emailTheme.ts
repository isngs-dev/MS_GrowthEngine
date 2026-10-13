/**
 * Shared HTML pieces for every e-mail, styled after the website: espresso brown page, glass-like card with a
 * caramel -> peach -> rose accent edge (the site's gradient border), cream text, peach glowing button.
 * Written with tables + inline styles so it renders in Gmail / Outlook / Apple Mail; gradients and the web
 * font are progressive enhancements with solid-colour fallbacks.
 */

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const T = {
  bg: "#1a120d",
  card: "#2a1c13",
  cardEdge: "#5a4030",
  panel: "#3a281b",
  panelEdge: "#55392a",
  cream: "#f6ece0",
  muted: "#cdb9a5",
  faint: "#a08a78",
  caramel: "#d4a373",
  peach: "#ffc4a0",
  rose: "#e6a4b8",
  ink: "#2a160c",
};

const FONT = "'Space Grotesk','Segoe UI',Helvetica,Arial,sans-serif";
const SITE = "https://www.isngs.com/";

/** Highlighted word inside a heading (the site uses gradient text; e-mail clients do not, so a solid peach). */
export const accent = (s: string) => `<span style="color:${T.peach}">${s}</span>`;

export const link = (url: string) => `<a href="${esc(url)}" style="color:${T.peach};text-decoration:underline">${esc(url)}</a>`;

/** Glass-style detail panel with label/value rows. Values must already be escaped HTML. */
export function detailPanel(rows: [label: string, value: string][], opts: { compact?: boolean } = {}) {
  const pad = opts.compact ? 12 : 18;
  const cells = rows
    .map(
      ([label, value], i) =>
        `<tr><td style="padding:0 0 ${i === rows.length - 1 ? 0 : pad}px"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${T.faint};padding-bottom:4px">${label}</div><div style="font-size:${opts.compact ? 15 : 17}px;font-weight:700;line-height:1.4;color:${T.cream}">${value}</div></td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${T.panel}" style="background:${T.panel};background-image:linear-gradient(145deg,#43301f,#34241a);border:1px solid ${T.panelEdge};border-radius:16px;margin:24px 0 0"><tr><td style="padding:22px 24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cells}</table></td></tr></table>`;
}

/** Peach call-to-action button with the site's glow. */
export function button(url: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 0"><tr><td bgcolor="${T.peach}" style="background:${T.peach};background-image:linear-gradient(110deg,#ffd9bf,#ffc4a0 55%,#e8b98a);border-radius:999px;box-shadow:0 10px 28px rgba(255,196,160,.35)"><a href="${esc(url)}" style="display:inline-block;padding:15px 34px;font-family:${FONT};font-size:16px;font-weight:700;color:${T.ink};text-decoration:none">${label}</a></td></tr></table>`;
}

export const note = (html: string) => `<p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:${T.faint}">${html}</p>`;

export const para = (html: string) => `<p style="margin:0;font-size:16px;line-height:1.65;color:${T.muted}">${html}</p>`;

export const strong = (s: string) => `<strong style="color:${T.cream}">${s}</strong>`;

/** Full HTML document around the content. `heading` may contain accent() spans. */
export function emailShell(opts: { heading: string; body: string; footer: string; preheader?: string }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
<title>${esc(opts.heading.replace(/<[^>]+>/g, ""))}</title></head>
<body style="margin:0;padding:0;background:${T.bg}" bgcolor="${T.bg}">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${T.bg}">${esc(opts.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${T.bg}" style="background:${T.bg};background-image:linear-gradient(180deg,#34231a 0,${T.bg} 340px)"><tr><td align="center" style="padding:36px 16px 40px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;font-family:${FONT}">
<tr><td style="padding:0 6px 22px;font-size:22px;color:${T.cream}"><span style="background:#fbefe3;border-radius:7px;padding:4px 11px;color:#2f5bd0;font-style:italic;font-weight:700">iSN</span><span style="color:#6b4c38">&nbsp; | &nbsp;</span><span style="font-weight:700;letter-spacing:-.01em">MS Growth Engine</span></td></tr>
<tr><td style="height:4px;line-height:4px;font-size:0;border-radius:28px 28px 0 0;background:${T.peach};background-image:linear-gradient(90deg,${T.caramel},${T.peach} 50%,${T.rose})">&nbsp;</td></tr>
<tr><td bgcolor="${T.card}" style="background:${T.card};background-image:linear-gradient(160deg,#33231a,#261a12);border:1px solid ${T.cardEdge};border-top:0;border-radius:0 0 28px 28px;padding:36px 34px 38px">
<h1 style="margin:0 0 16px;font-family:${FONT};font-size:32px;line-height:1.15;letter-spacing:-.02em;color:${T.cream}">${opts.heading}</h1>
${opts.body}
</td></tr>
<tr><td style="padding:22px 10px 0;font-size:12px;line-height:1.7;color:${T.faint};text-align:center">iSN Business Solutions &middot; <a href="${SITE}" style="color:${T.peach}">www.isngs.com</a><br/>${opts.footer}</td></tr>
</table></td></tr></table></body></html>`;
}
