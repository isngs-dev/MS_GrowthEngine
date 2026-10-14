/**
 * Lead form validation, shared by the browser (inline errors) and the API route
 * (never trust the client), so the rules live in exactly one place.
 */

export type LeadPayload = {
  name: string;
  company: string;
  website: string;
  phone: string;
  email: string;
};

export type LeadErrors = Partial<Record<keyof LeadPayload, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// digits plus the usual separators; the digit count / area code are checked separately
const PHONE_CHARS_RE = /^\+?[\d\s().-]+$/;

/** National digits of a US number: strips non-digits and a leading country code 1, caps at 10. */
const usDigits = (raw: string) => raw.replace(/\D/g, "").replace(/^1/, "").slice(0, 10);

/** Progressive "(555) 123-4567" formatter, safe to run on every keystroke. */
export function formatUsPhone(raw: string): string {
  const d = usDigits(raw);
  if (d.length <= 3) return d && `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
// optional scheme, a dotted host name, optional port / path
const URL_RE = /^(https?:\/\/)?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(:\d{2,5})?([/?#]\S*)?$/i;

export const FIELD_ORDER: (keyof LeadPayload)[] = ["name", "company", "website", "phone", "email"];

export function validateField(field: keyof LeadPayload, raw: string): string | undefined {
  const value = raw.trim();
  switch (field) {
    case "name":
      if (!value) return "Please enter your name.";
      if (value.length < 2) return "Your name looks too short.";
      return undefined;
    case "company":
      if (!value) return "Please enter your company name.";
      return undefined;
    case "website":
      if (!value) return "Please enter your company website.";
      if (!URL_RE.test(value)) return "Enter a valid website, like example.com.";
      return undefined;
    case "phone": {
      if (!value) return "Please enter your phone number.";
      if (!PHONE_CHARS_RE.test(value) || !/^[2-9]\d{9}$/.test(usDigits(value))) {
        return "Enter a valid US phone number, like (555) 123-4567.";
      }
      return undefined;
    }
    case "email":
      if (!value) return "Please enter your email address.";
      if (!EMAIL_RE.test(value)) return "Enter a valid email address.";
      return undefined;
  }
}

export function validateLead(values: LeadPayload): LeadErrors {
  const errors: LeadErrors = {};
  for (const field of FIELD_ORDER) {
    const message = validateField(field, values[field] ?? "");
    if (message) errors[field] = message;
  }
  return errors;
}

export function normalizeLead(values: LeadPayload): LeadPayload {
  const website = values.website.trim();
  return {
    name: values.name.trim(),
    company: values.company.trim(),
    website: website && !/^https?:\/\//i.test(website) ? `https://${website}` : website,
    phone: formatUsPhone(values.phone),
    email: values.email.trim().toLowerCase(),
  };
}
