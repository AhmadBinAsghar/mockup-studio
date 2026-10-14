import type { Metadata } from "next";

import { StepUpload } from "@/components/steps/StepUpload";

export const metadata: Metadata = { title: "Upload · Mockup Studio" };

export const instant = false;

export default function Page() {
  return <StepUpload />;
}
