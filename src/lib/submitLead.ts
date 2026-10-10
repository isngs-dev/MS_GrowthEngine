import { normalizeLead, type LeadPayload } from "./validation";

/**
 * PLACEHOLDER submit handler for the "BUILD MY GROWTH ENGINE" form.
 *
 * Today it POSTs to `src/app/api/lead/route.ts`, which validates the payload and
 * acknowledges it (and forwards it to LEAD_WEBHOOK_URL when that env var is set).
 * To connect a CRM or webhook, either:
 *
 *   1. set LEAD_WEBHOOK_URL in `.env.local` (HubSpot / Zapier / Make / n8n / your CRM's webhook), or
 *   2. implement the TODO in `src/app/api/lead/route.ts`, or
 *   3. replace the fetch below with a call straight to your own backend.
 *
 * The form UI only cares that this promise resolves (success) or rejects (error state).
 */
export async function submitLead(payload: LeadPayload): Promise<void> {
  const response = await fetch("/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalizeLead(payload)),
  });

  if (!response.ok) {
    throw new Error(`Lead submission failed with status ${response.status}`);
  }
}
