import { describe, expect, it } from "vitest";
import { BOOKING_STEPS, getStepIndex } from "./types";

describe("getStepIndex", () => {
  it("returns 0 for category", () => {
    expect(getStepIndex("category")).toBe(0);
  });

  it("returns last index for checkout", () => {
    expect(getStepIndex("checkout")).toBe(BOOKING_STEPS.length - 1);
  });

  it("falls back to 0 for unknown id", () => {
    expect(getStepIndex("unknown" as never)).toBe(0);
  });
});

describe("BOOKING_STEPS", () => {
  it("has 5 steps", () => {
    expect(BOOKING_STEPS).toHaveLength(5);
  });
});
