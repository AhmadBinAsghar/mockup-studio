import type { Metadata } from "next";

import { ContactPageBody } from "@/components/site/SitePages";

export const metadata: Metadata = { title: "Contact · Mockup Studio" };

export const instant = false;

export default function Page() {
  return <ContactPageBody />;
}
