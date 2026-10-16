import type { Metadata } from "next";

import { ContactForm } from "@/components/site/ContactForm";

export const metadata: Metadata = { title: "Contact · Mockup Studio" };

export const instant = false;

export default function Page() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">Contact us</h1>
        <p className="text-sm text-muted-foreground">
          Questions, bug reports or ideas? Send us a message and we&apos;ll reply by email.
        </p>
      </div>
      <ContactForm />
    </>
  );
}
