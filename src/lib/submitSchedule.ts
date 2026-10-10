import type { Meeting } from "./schedule";
import { normalizeLead, type LeadPayload } from "./validation";

/** Thrown when the chosen slot is already taken on the host calendar. */
export class SlotTakenError extends Error {}

export type ScheduleResult = { booked: boolean; emailed: boolean };

/**
 * Step two of the form: tell the server whether the visitor booked a call
 * (`meeting`) or declined (`null`). The server sends the matching SendGrid e-mail.
 * Rejects on network / server errors so the modal can offer a retry.
 */
export async function submitSchedule(lead: LeadPayload, meeting: Meeting | null): Promise<ScheduleResult> {
  const response = await fetch("/api/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lead: normalizeLead(lead), meeting }),
  });
  if (response.status === 409) throw new SlotTakenError("slot taken");
  if (!response.ok) throw new Error(`Schedule request failed with status ${response.status}`);
  const data = (await response.json()) as { booked?: boolean; emailed?: boolean };
  return { booked: !!data.booked, emailed: !!data.emailed };
}
