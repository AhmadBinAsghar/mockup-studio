import { expect, test } from "@playwright/test";

import { button } from "./helpers";

test("the language switcher translates the app, flips to RTL, and is remembered", async ({ page }) => {
  await page.goto("/upload");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.getByRole("combobox", { name: "Language" }).click();
  await page.getByRole("option", { name: "العربية" }).click();

  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("navigation", { name: "الخطوات" })).toBeVisible();
  await expect(button(page, "1. الرفع")).toBeVisible();

  // The choice survives a reload and applies on the other pages too, with the URL unchanged.
  await page.goto("/blog");
  await expect(page).toHaveURL(/\/blog$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Blog");
});

test("switching back to English restores LTR", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mockup-studio-lang", "ur"));
  await page.goto("/privacy");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy Policy");
});
