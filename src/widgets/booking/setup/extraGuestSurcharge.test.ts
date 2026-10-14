import { describe, expect, it } from "vitest";
import { computeExtraGuestSurcharge } from "./extraGuestSurcharge";

describe("computeExtraGuestSurcharge", () => {
  it("returns 0 when guests within includedCapacity", () => {
    expect(
      computeExtraGuestSurcharge({
        guestCount: 6,
        includedCapacity: 6,
        extraValuePerGuest: 1000,
        extraType: 0,
        durationHours: 3,
      })
    ).toEqual({ extraGuests: 0, unitPrice: 0, surcharge: 0 });
  });

  it("charges per session when extraType=0", () => {
    expect(
      computeExtraGuestSurcharge({
        guestCount: 8,
        includedCapacity: 6,
        extraValuePerGuest: 1000,
        extraType: 0,
        durationHours: 3,
      })
    ).toEqual({ extraGuests: 2, unitPrice: 1000, surcharge: 2000 });
  });

  it("multiplies by hours when extraType=1", () => {
    expect(
      computeExtraGuestSurcharge({
        guestCount: 7,
        includedCapacity: 6,
        extraValuePerGuest: 500,
        extraType: 1,
        durationHours: 3,
      })
    ).toEqual({ extraGuests: 1, unitPrice: 500, surcharge: 1500 });
  });
});
