import { describe, expect, it } from "vitest";

import { validateContact } from "./contact";

const ok = { name: "Sam", email: "sam@example.com", message: "Hello there, nice app!" };

describe("validateContact", () => {
  it("accepts valid input", () => {
    expect(validateContact(ok)).toEqual({});
  });
  it("rejects blank name, bad email and short message", () => {
    const e = validateContact({ name: " ", email: "nope", message: "hi" });
    expect(Object.keys(e).sort()).toEqual(["email", "message", "name"]);
  });
  it("rejects over-long message", () => {
    expect(validateContact({ ...ok, message: "x".repeat(4001) }).message).toBeDefined();
  });
});
