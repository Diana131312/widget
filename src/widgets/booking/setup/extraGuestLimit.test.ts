import { describe, expect, it } from "vitest";
import {
  EXTRA_GUEST_HARD_LIMIT,
  getMaxExtraGuests,
} from "./extraGuestLimit";

describe("getMaxExtraGuests", () => {
  it("returns 0 when no guests selected", () => {
    expect(getMaxExtraGuests(0, 8)).toBe(0);
  });

  it("returns 0 until main guests reach capacity", () => {
    expect(getMaxExtraGuests(1, 8)).toBe(0);
    expect(getMaxExtraGuests(7, 8)).toBe(0);
  });

  it("returns hard limit when guests are at capacity", () => {
    expect(getMaxExtraGuests(8, 8)).toBe(EXTRA_GUEST_HARD_LIMIT);
    expect(getMaxExtraGuests(4, 4)).toBe(EXTRA_GUEST_HARD_LIMIT);
    expect(EXTRA_GUEST_HARD_LIMIT).toBe(2);
  });
});
