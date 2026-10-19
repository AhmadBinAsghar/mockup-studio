export const STEPS = [
  { path: "/upload", titleKey: "steps.upload" },
  { path: "/targets", titleKey: "steps.targets" },
  { path: "/template", titleKey: "steps.template" },
  { path: "/customize", titleKey: "steps.customize" },
  { path: "/export", titleKey: "steps.export" },
] as const;

export const CUSTOMIZE_STEP = 3;

export const FIRST_STEP_PATH = STEPS[0].path;

export function stepIndexOf(pathname: string): number {
  return STEPS.findIndex((s) => s.path === pathname);
}
