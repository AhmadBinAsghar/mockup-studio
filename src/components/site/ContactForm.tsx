"use client";

import { useState, type FormEvent } from "react";

import { Field, Notice } from "@/components/shared/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { isMailConfigured, sendContact } from "@/lib/sendContact";
import { CONTACT_LIMITS, validateContact, type ContactErrors } from "@/validation/contact";

type Status = "idle" | "sending" | "sent" | "error";

const COOLDOWN_MS = 30_000;

export function ContactForm() {
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [lastSent, setLastSent] = useState(0);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (data.get("website")) return; // honeypot: bots fill hidden fields
    if (Date.now() - lastSent < COOLDOWN_MS) {
      setStatus("error");
      return;
    }
    const input = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      message: String(data.get("message") ?? ""),
    };
    const found = validateContact(input);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setStatus("sending");
    try {
      await sendContact(input);
      setLastSent(Date.now());
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (!isMailConfigured()) {
    return <Notice>The contact form isn&apos;t set up yet. Please check back soon.</Notice>;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field label="Name">
        <Input name="name" autoComplete="name" maxLength={CONTACT_LIMITS.name} aria-invalid={!!errors.name} />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </Field>
      <Field label="Email">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          maxLength={CONTACT_LIMITS.email}
          aria-invalid={!!errors.email}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </Field>
      <Field label="Message">
        <Textarea
          name="message"
          rows={6}
          maxLength={CONTACT_LIMITS.message}
          aria-invalid={!!errors.message}
        />
        {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
      </Field>
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send message"}
        </Button>
        <p role="status" className="text-sm">
          {status === "sent" && "Thanks! Your message was sent."}
          {status === "error" && (
            <span className="text-destructive">Couldn&apos;t send. Please wait a moment and try again.</span>
          )}
        </p>
      </div>
    </form>
  );
}
