import type { ReactNode } from "react";

import { Wizard } from "@/components/layout/Wizard";

export const instant = false;

export default function WizardLayout({ children }: { children: ReactNode }) {
  return <Wizard>{children}</Wizard>;
}
