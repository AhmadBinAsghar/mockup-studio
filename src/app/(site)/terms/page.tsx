import type { Metadata } from "next";
import Link from "next/link";

import { LegalSection } from "@/components/site/SiteShell";
import { LEGAL_UPDATED, SITE_NAME } from "@/config/site";

export const metadata: Metadata = { title: "Terms of Service · Mockup Studio" };

export const instant = false;

export default function Page() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold">Terms of Service</h1>
        <p className="text-xs text-muted-foreground">Last updated: {LEGAL_UPDATED}</p>
      </div>
      <LegalSection title="Acceptance">
        <p>
          By using {SITE_NAME} you agree to these terms. If you don&apos;t agree, please don&apos;t use the
          app.
        </p>
      </LegalSection>
      <LegalSection title="The service">
        <p>
          {SITE_NAME} lets you turn screenshots into store-ready marketing images in your browser. We may
          change, suspend or discontinue features at any time.
        </p>
      </LegalSection>
      <LegalSection title="Your content">
        <p>
          You keep all rights to the screenshots and images you use and create. You are responsible for having
          the right to use them, and you must not use the app for unlawful or infringing content. Because your
          work is stored only in your browser, you are responsible for backing up anything important by
          exporting it.
        </p>
      </LegalSection>
      <LegalSection title="Acceptable use">
        <p>
          Don&apos;t misuse the service, attempt to disrupt it, or send spam or abusive messages through the
          contact form.
        </p>
      </LegalSection>
      <LegalSection title="No warranty">
        <p>
          The service is provided &ldquo;as is&rdquo; without warranties of any kind. We don&apos;t guarantee
          it will be uninterrupted or error-free.
        </p>
      </LegalSection>
      <LegalSection title="Limitation of liability">
        <p>
          To the fullest extent permitted by law, we are not liable for any indirect or consequential damages,
          or for lost data, arising from your use of the service.
        </p>
      </LegalSection>
      <LegalSection title="Changes and contact">
        <p>
          We may update these terms; continued use means you accept the changes. Questions? See our{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>{" "}
          or{" "}
          <Link href="/contact" className="underline">
            contact us
          </Link>
          .
        </p>
      </LegalSection>
    </>
  );
}
