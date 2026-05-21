export const CONTACT_SUBJECT_OPTIONS = [
  "General Question",
  "Bug Report",
  "Billing Issue",
  "Feature Request",
  "Account Issue",
] as const;

export type ContactSubject = (typeof CONTACT_SUBJECT_OPTIONS)[number];

export function isContactSubject(s: string): s is ContactSubject {
  return (CONTACT_SUBJECT_OPTIONS as readonly string[]).includes(s);
}
