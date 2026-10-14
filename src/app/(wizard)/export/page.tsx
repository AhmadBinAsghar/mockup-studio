import type { Metadata } from "next";

import { StepExport } from "@/components/steps/StepExport";

export const metadata: Metadata = { title: "Export · Mockup Studio" };

export const instant = false;

export default function Page() {
  return <StepExport />;
}
