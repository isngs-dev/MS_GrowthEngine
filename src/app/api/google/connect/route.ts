import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * ONE-TIME SETUP: sends the calendar owner to Google's consent screen so we can obtain a refresh token.
 * Disabled unless GOOGLE_SETUP=1 (remove that line from .env.local once the token is saved).
 * Add `<site origin>/api/google/callback` to the OAuth client's authorised redirect URIs first.
 */
export async function GET(request: Request) {
  if (process.env.GOOGLE_SETUP !== "1" || !process.env.GOOGLE_CLIENT_ID) {
    return new NextResponse("Not enabled.", { status: 404 });
  }
  const origin = new URL(request.url).origin;
  const state = randomUUID();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${origin}/api/google/callback`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set("g_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/api/google" });
  return res;
}
