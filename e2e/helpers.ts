import { createCanvas } from "@napi-rs/canvas";
import { expect, type Page } from "@playwright/test";

export function makeCvImage(): Buffer {
  const canvas = createCanvas(1240, 1754);
  const g = canvas.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 1240, 1754);
  g.fillStyle = "#111";
  g.font = "bold 72px sans-serif";
  g.fillText("Jane Doe", 80, 140);
  g.fillRect(80, 200, 1080, 12);
  g.fillRect(80, 1600, 1080, 12);
  return canvas.toBuffer("image/png");
}

export const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

export async function uploadCv(page: Page, name = "cv.png") {
  await expect(page.locator('[data-ready="true"]')).toBeVisible();
  await page
    .getByLabel("Upload screenshots")
    .setInputFiles({ name, mimeType: "image/png", buffer: makeCvImage() });
  await expect(button(page, name)).toBeVisible();
}

export async function goNext(page: Page, path: string) {
  await button(page, "Next").click();
  await expect(page).toHaveURL(new RegExp(`/${path}$`));
}

export async function pickDefaultTargets(page: Page) {
  for (const target of [/^Phone/, /iPhone 6.3/]) await page.getByRole("checkbox", { name: target }).click();
}

export async function reachCustomize(page: Page, template: RegExp = /Tilted 3D/) {
  await page.goto("/upload");
  await uploadCv(page);
  await goNext(page, "targets");
  await pickDefaultTargets(page);
  await goNext(page, "template");
  await page.getByRole("radio", { name: template }).click();
  await goNext(page, "customize");
}
