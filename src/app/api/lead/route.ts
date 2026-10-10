import { NextResponse } from "next/server";
import { normalizeLead, validateLead, type LeadPayload } from "@/lib/validation";

/**
 * PLACEHOLDER lead endpoint: validates the submission and acknowledges it.
 *
 * Optional: set LEAD_WEBHOOK_URL (server-side env var) and every valid lead is
 * forwarded there as JSON ({ name, company, website, phone, email, source, receivedAt }).
 *
 * TODO: connect your CRM / email service here, for example:
 *   - push the lead into your CRM (HubSpot, Salesforce, Pipedrive...)
 *   - send a notification email (Resend, SendGrid, SES, SMTP...)
 *   - write it to your database / queue
 * Read secrets from environment variables, never from the client.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const input = (body ?? {}) as Partial<LeadPayload>;
  const lead = normalizeLead({
    name: String(input.name ?? ""),
    company: String(input.company ?? ""),
    website: String(input.website ?? ""),
    phone: String(input.phone ?? ""),
    email: String(input.email ?? ""),
  });

  const errors = validateLead(lead);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  const webhook = process.env.LEAD_WEBHOOK_URL;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lead, source: "ms-growth-engine-landing", receivedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
    } catch {
      return NextResponse.json({ ok: false, error: "Could not deliver the lead." }, { status: 502 });
    }
  }

  // Deliberately not logging the submission: it contains personal data.
  return NextResponse.json({ ok: true });
}
