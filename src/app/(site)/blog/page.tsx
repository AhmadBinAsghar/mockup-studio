import type { Metadata } from "next";

import { BlogIndexBody } from "@/components/site/SitePages";

export const metadata: Metadata = {
  title: "Blog · Mockup Studio",
  description:
    "Guides on app store screenshot sizes, design tips and privacy for making store-ready marketing images.",
  alternates: { canonical: "/blog" },
};

export const instant = false;

export default function Page() {
  return <BlogIndexBody />;
}
