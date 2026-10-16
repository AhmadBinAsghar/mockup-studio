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
  if (!name.trim()) errors.name = "Please enter your name.";
  else if (name.length > CONTACT_LIMITS.name) errors.name = "Name is too long.";
  if (!EMAIL_RE.test(email.trim()) || email.length > CONTACT_LIMITS.email)
    errors.email = "Please enter a valid email address.";
  if (message.trim().length < CONTACT_LIMITS.minMessage)
    errors.message = `Message must be at least ${CONTACT_LIMITS.minMessage} characters.`;
  else if (message.length > CONTACT_LIMITS.message) errors.message = "Message is too long.";
  return errors;
}
