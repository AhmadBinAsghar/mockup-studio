export const STEPS = [
  { path: "/upload", title: "Upload" },
  { path: "/targets", title: "Targets" },
  { path: "/template", title: "Template" },
  { path: "/customize", title: "Customize" },
  { path: "/export", title: "Export" },
] as const;

export const CUSTOMIZE_STEP = 3;

export const FIRST_STEP_PATH = STEPS[0].path;

export function stepIndexOf(pathname: string): number {
  return STEPS.findIndex((s) => s.path === pathname);
}
