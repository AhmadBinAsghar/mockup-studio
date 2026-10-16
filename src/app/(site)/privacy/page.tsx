import type { Metadata } from "next";
import Link from "next/link";

import { LegalSection } from "@/components/site/SiteShell";
import { LEGAL_UPDATED, SITE_NAME } from "@/config/site";

export const metadata: Metadata = { title: "Privacy Policy · Mockup Studio" };

export const instant = false;

export default function Page() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold">Privacy Policy</h1>
        <p className="text-xs text-muted-foreground">Last updated: {LEGAL_UPDATED}</p>
      </div>
      <LegalSection title="The short version">
        <p>
          {SITE_NAME} runs in your browser. Your screenshots, projects and exported images are processed on
          your device and are never uploaded to our servers. We have no accounts and no database.
        </p>
      </LegalSection>
      <LegalSection title="What stays on your device">
        <p>
          Your projects (including uploaded screenshots and settings) are saved in your browser&apos;s local
          storage and IndexedDB so your work survives a refresh. We also store your theme preference. This
          data never leaves your device, and you can remove it any time by deleting projects in the app or
          clearing your browser&apos;s site data.
        </p>
      </LegalSection>
      <LegalSection title="Information you send us">
        <p>
          If you use the{" "}
          <Link href="/contact" className="underline">
            contact form
          </Link>
          , we receive the name, email address and message you type. It is delivered to us by email through
          EmailJS, a third-party email delivery service, and is used only to respond to you. We don&apos;t
          store it in any database of our own.
        </p>
      </LegalSection>
      <LegalSection title="Cookies, analytics and tracking">
        <p>We don&apos;t use advertising cookies, analytics or tracking scripts.</p>
      </LegalSection>
      <LegalSection title="Third parties">
        <p>
          The site is served by our hosting provider, which may keep standard server logs (such as IP address
          and user agent) for security and operations. EmailJS processes contact-form messages under its own
          privacy policy.
        </p>
      </LegalSection>
      <LegalSection title="Your rights">
        <p>
          Since we hold no account data, there is little to access or delete. To ask us to delete an email you
          sent, or with any privacy question, use the{" "}
          <Link href="/contact" className="underline">
            contact form
          </Link>
          .
        </p>
      </LegalSection>
      <LegalSection title="Children">
        <p>
          {SITE_NAME} is not directed at children under 13, and we don&apos;t knowingly collect their data.
        </p>
      </LegalSection>
      <LegalSection title="Changes">
        <p>We may update this policy; the date above shows the latest revision.</p>
      </LegalSection>
    </>
  );
}
