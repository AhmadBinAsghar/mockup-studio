import { redirect } from "next/navigation";

import { FIRST_STEP_PATH } from "@/config/steps";

export const instant = false;

export default function Home() {
  redirect(FIRST_STEP_PATH);
}
