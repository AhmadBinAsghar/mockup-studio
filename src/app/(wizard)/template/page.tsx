import type { Metadata } from "next";

import { StepTemplate } from "@/components/steps/StepTemplate";

export const metadata: Metadata = { title: "Template · Mockup Studio" };

export const instant = false;

export default function Page() {
  return <StepTemplate />;
}
