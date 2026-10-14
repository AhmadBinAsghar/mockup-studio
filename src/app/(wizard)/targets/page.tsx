import type { Metadata } from "next";

import { StepTarget } from "@/components/steps/StepTarget";

export const metadata: Metadata = { title: "Targets · Shelf Shot Studio" };

export const instant = false;

export default function Page() {
  return <StepTarget />;
}
