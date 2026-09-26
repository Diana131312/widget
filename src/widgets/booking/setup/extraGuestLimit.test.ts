import { describe, expect, it } from "vitest";
import {
  EXTRA_GUEST_HARD_LIMIT,
  getMaxExtraGuests,
} from "./extraGuestLimit";

describe("getMaxExtraGuests", () => {
  it("returns 0 when no guests selected", () => {
    expect(getMaxExtraGuests(0)).toBe(0);
  });

  it("returns hard limit while guests >= 1", () => {
    expect(getMaxExtraGuests(1)).toBe(EXTRA_GUEST_HARD_LIMIT);
    expect(getMaxExtraGuests(4)).toBe(EXTRA_GUEST_HARD_LIMIT);
    expect(getMaxExtraGuests(8)).toBe(EXTRA_GUEST_HARD_LIMIT);
    expect(EXTRA_GUEST_HARD_LIMIT).toBe(2);
  });
});
