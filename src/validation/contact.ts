import { t } from "@/i18n/store";

export const CONTACT_LIMITS = { name: 80, email: 120, message: 4000, minMessage: 10 } as const;

export interface ContactInput {
  name: string;
  email: string;
  message: string;
}

export type ContactErrors = Partial<Record<keyof ContactInput, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact({ name, email, message }: ContactInput): ContactErrors {
  const errors: ContactErrors = {};
  if (!name.trim()) errors.name = t("contact.err.nameRequired");
  else if (name.length > CONTACT_LIMITS.name) errors.name = t("contact.err.nameLong");
  if (!EMAIL_RE.test(email.trim()) || email.length > CONTACT_LIMITS.email)
    errors.email = t("contact.err.emailInvalid");
  if (message.trim().length < CONTACT_LIMITS.minMessage)
    errors.message = t("contact.err.messageShort", { min: CONTACT_LIMITS.minMessage });
  else if (message.length > CONTACT_LIMITS.message) errors.message = t("contact.err.messageLong");
  return errors;
}
