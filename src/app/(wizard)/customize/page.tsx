import type { Metadata } from "next";

import { StepCustomize } from "@/components/steps/StepCustomize";

export const metadata: Metadata = { title: "Customize · Mockup Studio" };

export const instant = false;

export default function Page() {
  return <StepCustomize />;
}
