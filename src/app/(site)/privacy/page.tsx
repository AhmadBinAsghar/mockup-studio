import type { Metadata } from "next";

import { PrivacyBody } from "@/components/site/SitePages";

export const metadata: Metadata = { title: "Privacy Policy · Mockup Studio" };

export const instant = false;

export default function Page() {
  return <PrivacyBody />;
}
