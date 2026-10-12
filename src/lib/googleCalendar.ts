import { randomUUID } from "node:crypto";
import { meetingStartMs, MEETING_MINUTES, nextDate, type Meeting } from "./schedule";
import type { LeadPayload } from "./validation";

/**
 * Server-only Google Calendar integration (plain REST, no SDK).
 * Creates a calendar event with a Google Meet link for a booked call, after checking
 * that the slot is free on the host calendar.
 *
 * Auth: OAuth2 refresh token of the calendar owner (scope: calendar.events).
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 * Optional: GOOGLE_CALENDAR_ID (default "primary"), GOOGLE_SEND_INVITES ("false" to stop Google e-mailing the invite).
 */

export type MeetResult =
  | { status: "created"; meetUrl: string; eventUrl?: string }
  | { status: "conflict" }
  | { status: "error" };

export function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);
}

let cached: { token: string; expires: number } | null = null;

/** Access token for the connected Google account (cached until shortly before it expires). */
export async function getGoogleAccessToken() {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token request failed (${res.status})`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

export async function createMeetEvent(lead: LeadPayload, meeting: Meeting): Promise<MeetResult> {
  try {
    const token = await getGoogleAccessToken();
    const calendar = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || "primary");
    const base = `https://www.googleapis.com/calendar/v3/calendars/${calendar}/events`;
    const auth = { Authorization: `Bearer ${token}` };

    const startMs = meetingStartMs(meeting);
    const start = new Date(startMs).toISOString();
    const end = new Date(startMs + MEETING_MINUTES * 60_000).toISOString();

    // 1. is the slot still free on the host calendar?
    const busy = await fetch(
      `${base}?${new URLSearchParams({ timeMin: start, timeMax: end, singleEvents: "true", maxResults: "10" })}`,
      { headers: auth },
    );
    if (!busy.ok) throw new Error(`Calendar list failed (${busy.status})`);
    const existing = (await busy.json()) as { items?: { status?: string; transparency?: string }[] };
    if (existing.items?.some((e) => e.status !== "cancelled" && e.transparency !== "transparent")) {
      return { status: "conflict" };
    }

    // 2. create the event + Meet link
    const send = process.env.GOOGLE_SEND_INVITES === "false" ? "none" : "all";
    const res = await fetch(`${base}?${new URLSearchParams({ conferenceDataVersion: "1", sendUpdates: send })}`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: `MS Growth Engine: intro call with ${lead.name} (${lead.company})`,
        description: `Booked through the MS Growth Engine website.\n\nName: ${lead.name}\nCompany: ${lead.company}\nWebsite: ${lead.website}\nPhone: ${lead.phone}\nEmail: ${lead.email}`,
        start: { dateTime: start, timeZone: meeting.timeZone },
        end: { dateTime: end, timeZone: meeting.timeZone },
        attendees: [{ email: lead.email, displayName: lead.name }],
        conferenceData: {
          createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } },
        },
      }),
    });
    if (!res.ok) throw new Error(`Calendar insert failed (${res.status})`);
    const event = (await res.json()) as {
      hangoutLink?: string;
      htmlLink?: string;
      conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
    };
    const meetUrl = event.hangoutLink ?? event.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri;
    if (!meetUrl) throw new Error("Calendar event has no Meet link");
    return { status: "created", meetUrl, eventUrl: event.htmlLink };
  } catch (err) {
    // keep personal data out of the log: message only
    console.error("[google-calendar]", err instanceof Error ? err.message : "failed");
    return { status: "error" };
  }
}

/**
 * Busy time on the host calendar for one day (Eastern Time), or null if it could not be read.
 * `allDay` is true when an all-day event blocks the whole date.
 */
export async function busyForDay(date: string): Promise<{ allDay: boolean; intervals: [number, number][] } | null> {
  try {
    const token = await getGoogleAccessToken();
    const calendar = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || "primary");
    const from = meetingStartMs({ date, time: "00:00", timeZone: "America/New_York" });
    const to = meetingStartMs({ date: nextDate(date), time: "00:00", timeZone: "America/New_York" });
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendar}/events?${new URLSearchParams({
        timeMin: new Date(from).toISOString(),
        timeMax: new Date(to).toISOString(),
        singleEvents: "true",
        maxResults: "100",
      })}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`Calendar list failed (${res.status})`);
    const data = (await res.json()) as {
      items?: { status?: string; transparency?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string } }[];
    };
    let allDay = false;
    const intervals: [number, number][] = [];
    for (const e of data.items ?? []) {
      if (e.status === "cancelled" || e.transparency === "transparent") continue;
      if (e.start?.dateTime && e.end?.dateTime) intervals.push([Date.parse(e.start.dateTime), Date.parse(e.end.dateTime)]);
      else allDay = true;
    }
    return { allDay, intervals };
  } catch (err) {
    console.error("[google-calendar]", err instanceof Error ? err.message : "failed");
    return null;
  }
}
