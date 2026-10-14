import { STEPS } from "@/config/steps";

export interface Progress {
  slideCount: number;
  targetCount: number;
  templateChosen: boolean;
  customizeDone: boolean;
}

export function furthestStep(progress: Progress): number {
  const done = [
    progress.slideCount > 0,
    progress.targetCount > 0,
    progress.templateChosen,
    progress.customizeDone,
  ];
  const firstUnfinished = done.indexOf(false);
  return firstUnfinished === -1 ? STEPS.length - 1 : firstUnfinished;
}
