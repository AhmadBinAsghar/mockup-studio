import { expect, test, type Locator, type Page } from "@playwright/test";

import { goNext, pickDefaultTargets, uploadCv } from "./helpers";

interface Shape {
  id?: string;
  type: string;
  x: number;
  y: number;
  w: number;
  rotate?: number;
  fontSize?: number;
}

async function openBuilder(page: Page) {
  await page.goto("/upload");
  await uploadCv(page);
  await goNext(page, "targets");
  await pickDefaultTargets(page);
  await goNext(page, "template");
  await page.getByRole("button", { name: /^Edit: / }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Create your template" })).toBeVisible();
  return dialog;
}

/** Reads the draft through the Advanced tab, then returns to the Design tab. */
async function readLayers(dialog: Locator): Promise<Shape[]> {
  await dialog.getByRole("tab", { name: "Advanced (JSON)" }).click();
  const json = await dialog.getByLabel("Template JSON").inputValue();
  await dialog.getByRole("tab", { name: "Design" }).click();
  return (JSON.parse(json) as { layers: Shape[] }).layers;
}

const addBar = (dialog: Locator) => dialog.getByRole("group", { name: "Add to the design" });
const canvasOf = (dialog: Locator) => dialog.locator("canvas").first();
/** The clickable items drawn over the preview (not the same-named buttons in the side panel). */
const onCanvas = (dialog: Locator) => dialog.getByRole("application");

async function dragBy(page: Page, target: Locator, dx: number, dy: number, snapping = true) {
  const box = (await target.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  // Holding Alt turns snapping off, for tests that check exact positions.
  if (!snapping) await page.keyboard.down("Alt");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 4 });
  await page.mouse.move(x + dx, y + dy, { steps: 4 });
  await page.mouse.up();
  if (!snapping) await page.keyboard.up("Alt");
}

test("a decoration can be added, dragged, resized, rotated, deleted and undone on the canvas", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const dialog = await openBuilder(page);

  // Adding a circle from the bar next to the preview selects it straight away.
  await addBar(dialog).getByRole("button", { name: "Circle" }).click();
  const circle = onCanvas(dialog).locator('[role="button"][aria-pressed="true"]');
  await expect(circle).toHaveCount(1);
  await expect(dialog.getByRole("button", { name: /^Delete / })).toBeVisible();

  let layers = await readLayers(dialog);
  const start = layers.find((l) => l.id === "shape-1")!;
  expect(start).toMatchObject({ x: 58, y: 28, w: 34 });

  // Drag it with the mouse. The canvas is N screen pixels wide, so a drag of d pixels is d/N * 100 units.
  const canvasWidth = (await canvasOf(dialog).boundingBox())!.width;
  const [dx, dy] = [-70, 90];
  await dragBy(page, circle, dx, dy, false);
  layers = await readLayers(dialog);
  const moved = layers.find((l) => l.id === "shape-1")!;
  expect(moved.x).toBeCloseTo(start.x + (dx / canvasWidth) * 100, 0);
  expect(moved.y).toBeCloseTo(start.y + (dy / canvasWidth) * 100, 0);
  expect(moved.w).toBe(start.w);

  // Pull a corner handle outward to make it bigger.
  const handle = dialog.getByLabel("Resize").last();
  const h = (await handle.boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + 60, h.y + 60, { steps: 6 });
  await page.mouse.up();
  layers = await readLayers(dialog);
  expect(layers.find((l) => l.id === "shape-1")!.w).toBeGreaterThan(start.w + 5);

  // Rotate it with the rotate handle.
  const rotate = dialog.getByLabel("Rotate (hold Shift to snap)");
  const r = (await rotate.boundingBox())!;
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down();
  await page.mouse.move(r.x + 120, r.y + 70, { steps: 6 });
  await page.mouse.up();
  layers = await readLayers(dialog);
  expect(layers.find((l) => l.id === "shape-1")!.rotate ?? 0).not.toBe(0);

  // The ✕ on the item deletes it, and Undo brings it back.
  await dialog.getByRole("button", { name: /^Delete / }).click();
  layers = await readLayers(dialog);
  expect(layers.some((l) => l.id === "shape-1")).toBe(false);
  await dialog.getByRole("button", { name: "Undo" }).click();
  layers = await readLayers(dialog);
  expect(layers.some((l) => l.id === "shape-1")).toBe(true);

  expect(errors).toEqual([]);
});

test("the headline and subtitle can be dragged, and the headline cannot be deleted", async ({ page }) => {
  const dialog = await openBuilder(page);
  const canvasWidth = (await canvasOf(dialog).boundingBox())!.width;
  let layers = await readLayers(dialog);
  const before = layers.find((l) => l.type === "text")!;

  await clickCanvas(page, dialog, 0.5, 0.05);
  const headline = selectedOnCanvas(dialog);
  await expect(headline).toHaveAttribute("aria-label", "Headline");
  await expect(dialog.getByRole("button", { name: /^Delete Headline/ })).toHaveCount(0);

  await dragBy(page, headline, 30, 60);
  layers = await readLayers(dialog);
  const after = layers.find((l) => l.type === "text")!;
  expect(after.y).toBeGreaterThan(before.y + (40 / canvasWidth) * 100);
  expect(after.x).toBeGreaterThan(before.x);

  // Undo with the keyboard while the canvas has focus.
  await selectedOnCanvas(dialog).click();
  await page.keyboard.press("ControlOrMeta+z");
  layers = await readLayers(dialog);
  expect(layers.find((l) => l.type === "text")!.y).toBeCloseTo(before.y, 1);
});

test("arrow keys nudge the selected item and Delete removes it", async ({ page }) => {
  const dialog = await openBuilder(page);
  await addBar(dialog).getByRole("button", { name: "Square" }).click();
  const square = onCanvas(dialog).locator('[role="button"][aria-pressed="true"]');
  await expect(square).toHaveCount(1);
  const before = (await readLayers(dialog)).find((l) => l.id === "shape-1")!;

  await square.click();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  const nudged = (await readLayers(dialog)).find((l) => l.id === "shape-1")!;
  expect(nudged.x).toBeCloseTo(before.x + 0.5, 1);
  expect(nudged.y).toBeCloseTo(before.y + 0.5, 1);

  await square.click();
  await page.keyboard.press("Delete");
  expect((await readLayers(dialog)).some((l) => l.id === "shape-1")).toBe(false);
});

test("the Add bar can add a phone and a feature card, and tablet preview is view-only", async ({ page }) => {
  const dialog = await openBuilder(page);
  await addBar(dialog).getByRole("button", { name: "Phone" }).click();
  await addBar(dialog).getByRole("button", { name: "Card" }).click();
  const layers = await readLayers(dialog);
  expect(layers.filter((l) => l.type === "device")).toHaveLength(2);
  expect(layers.some((l) => l.type === "callout")).toBe(true);

  await dialog.getByRole("combobox", { name: "Preview size" }).click();
  await page.getByRole("option", { name: /Tablet/ }).click();
  await expect(dialog.getByRole("group", { name: "Add to the design" })).toHaveCount(0);
  await expect(dialog.getByText("Switch the preview to Phone")).toBeVisible();
});

/** Clicks a spot on the preview, given as fractions of the canvas width and height. */
async function clickCanvas(page: Page, dialog: Locator, fx: number, fy: number) {
  const box = (await canvasOf(dialog).boundingBox())!;
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
}

const selectedOnCanvas = (dialog: Locator) =>
  onCanvas(dialog).locator('[role="button"][aria-pressed="true"]');

test("a normal-sized phone can be selected by clicking it", async ({ page }) => {
  const dialog = await openBuilder(page);
  await expect(selectedOnCanvas(dialog)).toHaveCount(0);
  // Classic Top's phone covers more than half the canvas, which used to make it unclickable.
  await clickCanvas(page, dialog, 0.5, 0.62);
  await expect(selectedOnCanvas(dialog)).toHaveAttribute("aria-label", "Phone 1");
  // Clicking empty canvas deselects it again.
  await clickCanvas(page, dialog, 0.04, 0.97);
  await expect(selectedOnCanvas(dialog)).toHaveCount(0);
});

test("each half of a split phone selects its own phone", async ({ page }) => {
  const dialog = await openBuilder(page);
  await dialog.getByRole("combobox", { name: "Start from template" }).click();
  await page.getByRole("option", { name: /Split Reveal/ }).click();
  await expect(
    dialog.getByRole("group", { name: "Layers, front to back" }).getByRole("button", { name: "Phone 2" }),
  ).toBeVisible();

  await clickCanvas(page, dialog, 0.18, 0.55);
  await expect(selectedOnCanvas(dialog)).toHaveAttribute("aria-label", "Phone 1");
  await clickCanvas(page, dialog, 0.76, 0.7);
  await expect(selectedOnCanvas(dialog)).toHaveAttribute("aria-label", "Phone 2");
});

test("the side panel has no duplicate add or select buttons, and follows the selection", async ({ page }) => {
  const dialog = await openBuilder(page);
  // Adding happens in one place: the bar above the preview.
  await expect(dialog.getByRole("button", { name: "+ Circle" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "+ Add phone" })).toHaveCount(0);
  await expect(addBar(dialog).getByRole("button", { name: "Circle" })).toBeVisible();

  // The Phone panel shows its controls only for a selected phone.
  await expect(dialog.getByLabel("Phone finish")).toHaveCount(0);
  await clickCanvas(page, dialog, 0.5, 0.62);
  await expect(dialog.getByLabel("Phone finish")).toBeVisible();

  // The Decorations panel shows color controls for a selected decoration.
  await addBar(dialog).getByRole("button", { name: "Circle" }).click();
  await expect(dialog.getByText("Opacity", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Left position")).toHaveCount(0);
  await expect(dialog.getByText("Top position")).toHaveCount(0);
});
