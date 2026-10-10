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
// digits plus the usual separators; 7-15 digits covers local through E.164 numbers
const PHONE_CHARS_RE = /^\+?[\d\s().-]+$/;
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
      const digits = value.replace(/\D/g, "");
      if (!PHONE_CHARS_RE.test(value) || digits.length < 7 || digits.length > 15) {
        return "Enter a valid phone number (7 to 15 digits).";
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
    phone: values.phone.trim(),
    email: values.email.trim().toLowerCase(),
  };
}
