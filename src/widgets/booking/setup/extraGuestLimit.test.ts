import { describe, expect, it } from "vitest";
import { getMaxExtraGuests, splitGuestCount } from "./extraGuestLimit";

describe("splitGuestCount", () => {
  it("splits total into base + extra", () => {
    expect(splitGuestCount(7, 6, 8)).toEqual({
      baseGuests: 6,
      extraGuests: 1,
      maxBaseGuests: 6,
      maxExtraGuests: 2,
      extraUnlocked: true,
    });
  });

  it("keeps extras at 0 until includedCapacity is filled", () => {
    expect(splitGuestCount(5, 6, 8)).toMatchObject({
      baseGuests: 5,
      extraGuests: 0,
      extraUnlocked: false,
      maxExtraGuests: 2,
    });
  });

  it("homes: capacity as base, maxCapacity as total", () => {
    expect(splitGuestCount(4, 2, 6)).toEqual({
      baseGuests: 2,
      extraGuests: 2,
      maxBaseGuests: 2,
      maxExtraGuests: 4,
      extraUnlocked: true,
    });
  });
});

describe("getMaxExtraGuests", () => {
  it("returns 0 when no guests selected", () => {
    expect(getMaxExtraGuests(0, 6, 8)).toBe(0);
  });

  it("returns 0 until main guests reach includedCapacity", () => {
    expect(getMaxExtraGuests(1, 6, 8)).toBe(0);
    expect(getMaxExtraGuests(5, 6, 8)).toBe(0);
  });

  it("returns room extra capacity when included is filled", () => {
    expect(getMaxExtraGuests(6, 6, 8)).toBe(2);
    expect(getMaxExtraGuests(8, 6, 8)).toBe(2);
    expect(getMaxExtraGuests(2, 2, 6)).toBe(4);
  });

  it("returns 0 when room has no extra capacity", () => {
    expect(getMaxExtraGuests(4, 4, 4)).toBe(0);
  });
});
