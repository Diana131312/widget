import { describe, expect, it } from "vitest";
import { BOOKING_STEPS, getStepIndex } from "./types";

describe("getStepIndex", () => {
  it("returns 0 for category", () => {
    expect(getStepIndex("category")).toBe(0);
  });

  it("returns checkout as step 4 (index 3)", () => {
    expect(getStepIndex("checkout")).toBe(3);
  });

  it("returns last index for done", () => {
    expect(getStepIndex("done")).toBe(BOOKING_STEPS.length - 1);
  });

  it("falls back to 0 for unknown id", () => {
    expect(getStepIndex("unknown" as never)).toBe(0);
  });
});

describe("BOOKING_STEPS", () => {
  it("has 6 visible steps including verify and done", () => {
    expect(BOOKING_STEPS).toHaveLength(6);
    expect(BOOKING_STEPS.map((s) => s.id)).toEqual([
      "category",
      "object",
      "setup",
      "checkout",
      "verify",
      "done",
    ]);
  });
});
