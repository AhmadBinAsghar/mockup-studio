import type { Metadata } from "next";

import { TermsBody } from "@/components/site/SitePages";

export const metadata: Metadata = { title: "Terms of Service · Mockup Studio" };

export const instant = false;

export default function Page() {
  return <TermsBody />;
}
