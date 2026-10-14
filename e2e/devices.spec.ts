import { expect, test, type Page } from "@playwright/test";

import { goNext, pickDefaultTargets, reachCustomize, uploadCv } from "./helpers";

async function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

test("every wizard step fits the screen without sideways scrolling", async ({ page }) => {
  await page.goto("/upload");
  await uploadCv(page);
  expect(await scrollsSideways(page), "upload step").toBe(false);

  await goNext(page, "targets");
  await pickDefaultTargets(page);
  expect(await scrollsSideways(page), "targets step").toBe(false);

  await goNext(page, "template");
  expect(await scrollsSideways(page), "template step").toBe(false);
});

test("customize and export steps fit the screen and export works", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await reachCustomize(page);
  expect(await scrollsSideways(page), "customize step").toBe(false);

  await goNext(page, "export");
  expect(await scrollsSideways(page), "export step").toBe(false);

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Generate/ }).click();
  expect((await download).suggestedFilename()).toBe("store-screenshots.zip");
  expect(errors).toEqual([]);
});
