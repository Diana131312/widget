import { describe, expect, it } from "vitest";
import { resolveClientPrepay } from "./resolveClientPrepay";

describe("resolveClientPrepay", () => {
  it("returns null when no prepay and products are not included by flag", () => {
    expect(resolveClientPrepay(null, 0)).toBeNull();
    expect(resolveClientPrepay(0, 500, false)).toBeNull();
    expect(resolveClientPrepay(null, 700, null)).toBeNull();
  });

  it("keeps api prepay when flag is not true", () => {
    expect(resolveClientPrepay(3000, 500)).toBe(3000);
    expect(resolveClientPrepay(3000, 500, false)).toBe(3000);
  });

  it("adds products when prepayIncludesProducts is true", () => {
    expect(resolveClientPrepay(3000, 500, true)).toBe(3500);
  });

  it("shows products alone when flag is true and api prepay is empty", () => {
    expect(resolveClientPrepay(null, 700, true)).toBe(700);
  });
});
