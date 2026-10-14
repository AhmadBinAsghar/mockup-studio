import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import fs from "node:fs";

import { button, goNext, pickDefaultTargets, reachCustomize, uploadCv } from "./helpers";
import { readPngInfo } from "../src/renderer/png";

test("upload → targets → template → export produces a valid ZIP", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/upload");
  await uploadCv(page);
  await goNext(page, "targets");
  await pickDefaultTargets(page);
  await page.getByRole("checkbox", { name: /Feature graphic/ }).click();
  await goNext(page, "template");
  await page.getByRole("radio", { name: /Tilted 3D/ }).click();
  await goNext(page, "customize");
  await page.getByLabel("Headline", { exact: true }).fill("Hire me fast");
  await page.getByRole("combobox", { name: "Add language" }).click();
  await page.getByRole("option", { name: "Spanish" }).click();
  await page.getByLabel("Headline", { exact: true }).fill("Contrátame ya");
  await goNext(page, "export");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Generate/ }).click();
  const zip = await JSZip.loadAsync(fs.readFileSync(await (await download).path()));

  const read = (path: string) => zip.file(path)!.async("uint8array");
  expect(readPngInfo(await read("en/google-play/phone/01.png"))).toMatchObject({
    width: 1080,
    height: 1920,
    colorType: 2,
  });
  expect(readPngInfo(await read("es/app-store/6.3-inch/01.png"))).toMatchObject({
    width: 1206,
    height: 2622,
    colorType: 2,
  });
  expect(readPngInfo(await read("es/google-play/feature-graphic/01.png"))).toMatchObject({
    width: 1024,
    height: 500,
    colorType: 2,
  });
  expect(errors).toEqual([]);
});

test("project survives a refresh", async ({ page }) => {
  await page.goto("/upload");
  await uploadCv(page, "keep.png");
  await page.waitForTimeout(500);
  await page.reload();
  await expect(button(page, "keep.png")).toBeVisible();
});

test("dark theme toggles and persists", async ({ page }) => {
  await page.goto("/upload");
  const html = page.locator("html");
  await page.getByRole("button", { name: /Switch to (dark|light) theme/ }).click();
  const wasDark = await html.evaluate((el) => el.classList.contains("dark"));
  await page.reload();
  await expect(html).toHaveClass(wasDark ? /dark/ : /^((?!dark).)*$/);
});

test("buttons show the pointer cursor", async ({ page }) => {
  await page.goto("/upload");
  await uploadCv(page, "cursor.png");
  const cursorOf = (name: string) => button(page, name).evaluate((el) => getComputedStyle(el).cursor);
  expect(await cursorOf("Next")).toBe("pointer");
  expect(await cursorOf("2. Targets")).toBe("pointer");
  expect(await cursorOf("Back")).toBe("not-allowed");
});

test("exports Japanese, Arabic and Urdu text without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  await reachCustomize(page);
  for (const [language, headline] of [
    ["Japanese", "毎日をもっと簡単に"],
    ["Arabic (right-to-left)", "خطط ليومك بسهولة"],
    ["Urdu (right-to-left)", "اپنے دن کی منصوبہ بندی آسانی سے کریں"],
  ]) {
    await page.getByRole("combobox", { name: "Add language" }).click();
    await page.getByRole("option", { name: language }).click();
    await page.getByLabel("Headline", { exact: true }).fill(headline);
  }
  await goNext(page, "export");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Generate/ }).click();
  const zip = await JSZip.loadAsync(fs.readFileSync(await (await download).path()));
  expect(Object.keys(zip.files)).toEqual(
    expect.arrayContaining([
      "en/google-play/phone/01.png",
      "ja/google-play/phone/01.png",
      "ar/google-play/phone/01.png",
      "ur/google-play/phone/01.png",
    ]),
  );
  expect(errors).toEqual([]);
});

test.describe("step guard", () => {
  test("opening a later step by URL bounces back to Upload", async ({ page }) => {
    for (const path of ["/targets", "/template", "/customize", "/export"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/upload$/);
    }
  });

  test("finishing a section unlocks the next one straight away, and only that one", async ({ page }) => {
    await page.goto("/upload");
    await expect(button(page, "Next")).toBeDisabled();
    await expect(button(page, "2. Targets")).toBeDisabled();

    await uploadCv(page);
    await expect(button(page, "Next")).toBeEnabled();
    await expect(button(page, "2. Targets")).toBeEnabled();
    await expect(button(page, "3. Template")).toBeDisabled();
    await page.waitForTimeout(500);
    await page.goto("/template");
    await expect(page).toHaveURL(/\/targets$/);

    await expect(button(page, "Next")).toBeDisabled();
    await expect(button(page, "3. Template")).toBeDisabled();
    await page.getByRole("checkbox", { name: /^Phone/ }).click();
    await expect(button(page, "3. Template")).toBeEnabled();
    await expect(button(page, "4. Customize")).toBeDisabled();

    await goNext(page, "template");
    await expect(button(page, "Next")).toBeDisabled();
    await page.getByRole("radio", { name: /Classic Top/ }).click();
    await expect(button(page, "4. Customize")).toBeEnabled();
    await expect(button(page, "5. Export")).toBeDisabled();

    await goNext(page, "customize");
    await expect(button(page, "5. Export")).toBeEnabled();
    await page.getByLabel("Headline", { exact: true }).fill("");
    await expect(button(page, "5. Export")).toBeDisabled();
  });

  test("removing every target locks the later steps again", async ({ page }) => {
    await reachCustomize(page);
    await button(page, "2. Targets").click();
    for (const target of [/^Phone/, /iPhone 6.3/]) await page.getByRole("checkbox", { name: target }).click();
    await expect(button(page, "3. Template")).toBeDisabled();
    await expect(button(page, "Next")).toBeDisabled();
    await page.goto("/export");
    await expect(page).toHaveURL(/\/targets$/);
  });
});

test("responses carry security headers", async ({ request }) => {
  const headers = (await request.get("/upload")).headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test.describe("projects", () => {
  test("each project keeps its own screenshots; create, rename and delete work", async ({ page }) => {
    await page.goto("/upload");
    await uploadCv(page, "first.png");
    await page.waitForTimeout(500);

    await button(page, "Project 1").click();
    await page.getByRole("button", { name: "New project" }).click();
    await expect(page).toHaveURL(/\/upload$/);
    await expect(button(page, "first.png")).toHaveCount(0);
    await expect(button(page, "Project 2")).toBeVisible();
    await expect(button(page, "Next")).toBeDisabled();

    await button(page, "Project 2").click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^Project 1/ })
      .click();
    await expect(button(page, "first.png")).toBeVisible();

    await button(page, "Project 1").click();
    await page.getByRole("dialog").getByRole("button", { name: "Rename" }).first().click();
    await page.getByLabel("Project name").fill("Fitness app");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("button", { name: /^Fitness app/ })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(button(page, "Fitness app")).toBeVisible();

    await button(page, "Fitness app").click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).first().click();
    await page.getByRole("button", { name: "Confirm delete" }).click();
    await expect(button(page, "Project 2")).toBeVisible();
    await expect(button(page, "first.png")).toHaveCount(0);
  });

  test("removing the last screenshot resets the project's settings", async ({ page }) => {
    await page.goto("/upload");
    await uploadCv(page);
    await goNext(page, "targets");
    await pickDefaultTargets(page);
    await goNext(page, "template");
    await page.getByRole("radio", { name: /Classic Top/ }).click();

    await button(page, "1. Upload").click();
    await button(page, "Delete cv.png").click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("Remove your last screenshot?");
    await expect(dialog).toContainText("1 screenshot: cv.png");
    await expect(dialog).toContainText("Store sizes: Google Play Phone");
    await expect(dialog).toContainText("Template: Classic Top");
    await button(page, "Keep it").click();
    await expect(button(page, "cv.png")).toBeVisible();
    await expect(button(page, "2. Targets")).toBeEnabled();

    await button(page, "Delete cv.png").click();
    await button(page, "Delete and start over").click();
    await expect(button(page, "2. Targets")).toBeDisabled();

    await uploadCv(page, "again.png");
    await goNext(page, "targets");
    await expect(page.getByRole("checkbox", { name: /^Phone/ })).not.toBeChecked();
    await expect(button(page, "3. Template")).toBeDisabled();
  });
});

test("template categories filter the gallery, and each screenshot can get its own design", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/upload");
  await uploadCv(page, "first.png");
  await uploadCv(page, "second.png");
  await goNext(page, "targets");
  await pickDefaultTargets(page);
  await goNext(page, "template");

  const radio = (name: RegExp) => page.getByRole("radio", { name });
  await page.getByRole("button", { name: /^Games/ }).click();
  await expect(radio(/Synthwave Arcade/)).toBeVisible();
  await expect(radio(/Classic Top/)).toHaveCount(0);

  await page.getByRole("button", { name: "Screenshot 2" }).click();
  await radio(/Synthwave Arcade/).click();
  await expect(radio(/Synthwave Arcade/)).toHaveAttribute("aria-checked", "true");

  await page.getByRole("button", { name: "Screenshot 1" }).click();
  await page.getByRole("button", { name: /^General/ }).click();
  await radio(/Classic Top/).click();
  await goNext(page, "customize");
  await goNext(page, "export");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Generate/ }).click();
  const zip = await JSZip.loadAsync(fs.readFileSync(await (await download).path()));
  const first = await zip.file("google-play/phone/01.png")!.async("uint8array");
  const second = await zip.file("google-play/phone/02.png")!.async("uint8array");
  expect(Buffer.from(first).equals(Buffer.from(second))).toBe(false);
  expect(readPngInfo(second)).toMatchObject({ width: 1080, height: 1920, colorType: 2 });
  expect(errors).toEqual([]);
});

test("the template builder creates, applies, edits and exports a custom template", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/upload");
  await uploadCv(page);
  await goNext(page, "targets");
  await pickDefaultTargets(page);
  await goNext(page, "template");

  await page.getByRole("button", { name: /^Edit: / }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Create your template" })).toBeVisible();
  await dialog.getByLabel("Template name").fill("Neon Test");
  const add = dialog.getByRole("group", { name: "Add to the design" });
  await add.getByRole("button", { name: "Glow" }).click();
  await add.getByRole("button", { name: "Circle" }).click();
  await add.getByRole("button", { name: "Phone" }).click();
  await expect(
    dialog.getByRole("group", { name: "Layers, front to back" }).getByRole("button", { name: "Phone 2" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Save template" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^My templates/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("radio", { name: /Neon Test/ })).toHaveAttribute("aria-checked", "true");

  await page.getByRole("button", { name: /^Edit: / }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Edit your template" })).toBeVisible();
  await page.getByRole("dialog").getByLabel("Template name").fill("Neon Test 2");
  await page.getByRole("dialog").getByRole("button", { name: "Save template" }).click();
  await expect(page.getByRole("radio", { name: /Neon Test 2/ })).toBeVisible();

  await goNext(page, "customize");
  await goNext(page, "export");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Generate/ }).click();
  const zip = await JSZip.loadAsync(fs.readFileSync(await (await download).path()));
  expect(readPngInfo(await zip.file("google-play/phone/01.png")!.async("uint8array"))).toMatchObject({
    width: 1080,
    height: 1920,
    colorType: 2,
  });
  expect(errors).toEqual([]);
});

test("a custom template made for one screenshot applies only to that screenshot", async ({ page }) => {
  await page.goto("/upload");
  await uploadCv(page, "first.png");
  await uploadCv(page, "second.png");
  await goNext(page, "targets");
  await pickDefaultTargets(page);
  await goNext(page, "template");

  await page.getByRole("button", { name: "Screenshot 2" }).click();
  await page.getByRole("button", { name: /^Edit: / }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("applied to screenshot 2 only");
  await dialog.getByLabel("Template name").fill("Only Second");
  await dialog.getByRole("button", { name: "Save template" }).click();

  const mine = page.getByRole("radio", { name: /Only Second/ });
  await expect(mine).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Screenshot 1" }).click();
  await expect(mine).toHaveAttribute("aria-checked", "false");
  await page.getByRole("button", { name: "Screenshot 2" }).click();
  await expect(mine).toHaveAttribute("aria-checked", "true");
});

test("a background chosen in Customize shows only on the design it was chosen for", async ({ page }) => {
  await page.goto("/upload");
  await uploadCv(page);
  await goNext(page, "targets");
  await pickDefaultTargets(page);
  await goNext(page, "template");
  await page.getByRole("radio", { name: /Classic Top/ }).click();
  await goNext(page, "customize");

  const cornerPixel = () =>
    page
      .getByLabel("Live preview")
      .locator("canvas")
      .first()
      .evaluate((el) => {
        const canvas = el as HTMLCanvasElement;
        const [r, g, b] = canvas.getContext("2d")!.getImageData(3, 3, 1, 1).data;
        return { r, g, b };
      });
  const isRed = (p: { r: number; g: number; b: number }) => p.r > 200 && p.g < 60 && p.b < 60;

  await page.getByRole("combobox", { name: "Background type" }).click();
  await page.getByRole("option", { name: "Solid color" }).click();
  await page.getByLabel("Color 1").fill("#ff0000");
  await expect.poll(async () => isRed(await cornerPixel())).toBe(true);

  await button(page, "3. Template").click();
  await page.getByRole("radio", { name: /Tilted 3D/ }).click();
  await goNext(page, "customize");
  await expect.poll(async () => isRed(await cornerPixel())).toBe(false);

  await button(page, "3. Template").click();
  await page.getByRole("radio", { name: /Classic Top/ }).click();
  await goNext(page, "customize");
  await expect.poll(async () => isRed(await cornerPixel())).toBe(true);
});

test("the match-to-brand option is saved with the project", async ({ page }) => {
  await reachCustomize(page);
  const option = page.getByRole("checkbox", { name: "Match all templates to my brand color" });
  await expect(option).not.toBeChecked();
  await option.click();
  await expect(option).toBeChecked();
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Match all templates to my brand color" })).toBeChecked();
});
