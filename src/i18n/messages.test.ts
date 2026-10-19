import { describe, expect, it } from "vitest";

import { UI_LOCALES } from "./config";
import en from "./messages/en.json";
import { t, tn } from "./store";

type Messages = Record<string, string>;

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(",");
const tags = (text: string) => (text.match(/<\/?\w+>/g) ?? []).sort().join(",");
const PLURAL_FORM = /\.(zero|one|two|few|many|other)$/;

const others = UI_LOCALES.filter((l) => l.code !== "en");

describe.each(others)("$code translations", ({ code }) => {
  it("covers every English message", async () => {
    const messages: Messages = (await import(`./messages/${code}.json`)).default;
    const missing = Object.keys(en).filter((key) => !(key in messages));
    expect(missing).toEqual([]);
  });

  it("has no keys English does not have (other than extra plural forms)", async () => {
    const messages: Messages = (await import(`./messages/${code}.json`)).default;
    const english = en as Messages;
    const extra = Object.keys(messages).filter((key) => {
      if (key in english) return false;
      return !(PLURAL_FORM.test(key) && key.replace(PLURAL_FORM, ".other") in english);
    });
    expect(extra).toEqual([]);
  });

  it("keeps every {placeholder} and <tag> from English", async () => {
    const messages: Messages = (await import(`./messages/${code}.json`)).default;
    const english = en as Messages;
    const broken = Object.keys(english).filter((key) => {
      const base = key in messages ? messages[key] : "";
      return placeholders(base) !== placeholders(english[key]) || tags(base) !== tags(english[key]);
    });
    expect(broken).toEqual([]);
  });

  it("has no empty messages", async () => {
    const messages: Messages = (await import(`./messages/${code}.json`)).default;
    expect(Object.entries(messages).filter(([, v]) => v.trim() === "")).toEqual([]);
  });
});

describe("t()", () => {
  it("fills placeholders and falls back to the key", () => {
    expect(t("wizard.back")).toBe("Back");
    expect(t("upload.errMax", { max: 8 })).toBe("You can add up to 8 screenshots.");
    expect(t("no.such.key")).toBe("no.such.key");
  });

  it("picks plural forms", () => {
    expect(tn("export.slides", 1)).toBe("1 slide");
    expect(tn("export.slides", 3)).toBe("3 slides");
  });
});
