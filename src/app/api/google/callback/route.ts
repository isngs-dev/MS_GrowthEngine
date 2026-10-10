import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

/**
 * ONE-TIME SETUP: Google redirects here with a code. We swap it for a refresh token and store it in
 * .env.local as GOOGLE_REFRESH_TOKEN (the token is never shown in the browser or logged).
 * Disabled unless GOOGLE_SETUP=1.
 */
function page(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font-family:Arial,sans-serif;background:#1a120d;color:#f6ece0;display:grid;place-items:center;min-height:100vh;margin:0"><div style="max-width:520px;padding:24px"><h1>${title}</h1><p>${body}</p></div>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: Request) {
  if (process.env.GOOGLE_SETUP !== "1" || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return new NextResponse("Not enabled.", { status: 404 });
  }
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)g_state=([^;]+)/)?.[1];
  if (url.searchParams.get("error")) return page("Google sign-in was cancelled", "Nothing was saved. Open /api/google/connect to try again.", 400);
  if (!code || !state || state !== cookie) return page("Invalid request", "The sign-in state did not match. Open /api/google/connect again.", 400);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/api/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  const data = (await res.json()) as { refresh_token?: string; error?: string };
  if (!res.ok || !data.refresh_token) {
    return page("Could not get a refresh token", `Google said: ${data.error ?? res.status}. If you connected before, remove the app at myaccount.google.com/permissions and try again.`, 400);
  }

  // store it in .env.local (replace an existing line, otherwise append)
  const file = path.join(process.cwd(), ".env.local");
  let text = "";
  try {
    text = await fs.readFile(file, "utf8");
  } catch {
    /* new file */
  }
  const line = `GOOGLE_REFRESH_TOKEN=${data.refresh_token}`;
  text = /^GOOGLE_REFRESH_TOKEN=.*$/m.test(text) ? text.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, line) : `${text.replace(/\n?$/, "\n")}${line}\n`;
  await fs.writeFile(file, text, "utf8");
  process.env.GOOGLE_REFRESH_TOKEN = data.refresh_token; // usable immediately, no restart

  return page("Google Calendar connected", "The refresh token is saved in .env.local. You can close this tab and remove GOOGLE_SETUP=1 from .env.local.");
}
