import { EMAILJS } from "@/config/site";
import type { ContactInput } from "@/validation/contact";

export function isMailConfigured(): boolean {
  return Boolean(EMAILJS.serviceId && EMAILJS.templateId && EMAILJS.publicKey);
}

/** Sends the message through EmailJS straight from the browser — no server or database involved. */
export async function sendContact({ name, email, message }: ContactInput): Promise<void> {
  if (!isMailConfigured()) throw new Error("Contact form is not configured.");
  const res = await fetch(EMAILJS.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS.serviceId,
      template_id: EMAILJS.templateId,
      user_id: EMAILJS.publicKey,
      template_params: {
        from_name: name.trim(),
        reply_to: email.trim(),
        message: message.trim(),
      },
    }),
  });
  if (!res.ok) throw new Error(`Send failed (${res.status}).`);
}
