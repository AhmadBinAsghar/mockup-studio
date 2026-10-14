"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SliderRow } from "@/components/builder/controls";
import { useProject } from "@/store/useProject";
import type { Slide } from "@/types";

const OFFSET_RANGE = 40;
const NUDGE = 2;

export function DevicePositionControls({ slide }: { slide: Slide }) {
  const updateSlide = useProject((s) => s.updateSlide);
  const x = slide.deviceOffsetX ?? 0;
  const y = slide.deviceOffsetY ?? 0;
  const scale = slide.deviceScale ?? 1;
  const moved = x !== 0 || y !== 0 || scale !== 1;
  const nudge = (dx: number, dy: number) =>
    updateSlide(slide.id, { deviceOffsetX: x + dx, deviceOffsetY: y + dy });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label>Screenshot position</Label>
        <Button
          variant="outline"
          size="sm"
          disabled={!moved}
          onClick={() => updateSlide(slide.id, { deviceOffsetX: 0, deviceOffsetY: 0, deviceScale: 1 })}
        >
          Reset
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Button variant="outline" size="sm" aria-label="Move screenshot up" onClick={() => nudge(0, -NUDGE)}>
          ↑ Up
        </Button>
        <Button variant="outline" size="sm" aria-label="Move screenshot down" onClick={() => nudge(0, NUDGE)}>
          ↓ Down
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label="Move screenshot left"
          onClick={() => nudge(-NUDGE, 0)}
        >
          ← Left
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label="Move screenshot right"
          onClick={() => nudge(NUDGE, 0)}
        >
          → Right
        </Button>
      </div>
      <SliderRow
        label="Vertical"
        value={y}
        min={-OFFSET_RANGE}
        max={OFFSET_RANGE}
        step={0.5}
        onChange={(deviceOffsetY) => updateSlide(slide.id, { deviceOffsetY })}
      />
      <SliderRow
        label="Horizontal"
        value={x}
        min={-OFFSET_RANGE}
        max={OFFSET_RANGE}
        step={0.5}
        onChange={(deviceOffsetX) => updateSlide(slide.id, { deviceOffsetX })}
      />
      <SliderRow
        label="Size"
        value={scale}
        min={0.5}
        max={1.5}
        step={0.01}
        onChange={(deviceScale) => updateSlide(slide.id, { deviceScale })}
      />
    </div>
  );
}
