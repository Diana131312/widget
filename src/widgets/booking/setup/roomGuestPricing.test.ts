import { describe, expect, it } from "vitest";
import type { WidgetGetResponse } from "../../../api";
import {
  extraGuestRateForNightDate,
  getRoomGuestLimits,
  listStayNightDates,
  resolveExtraGuestSurcharge,
} from "./roomGuestPricing";

const homesConfig = {
  dailyRooms: [
    {
      id: "d1",
      name: "МЯТА",
      capacity: 4,
      maxCapacity: 6,
      pricePeriod: {
        weekDayPrice: 4900,
        weekEndPrice: 6900,
        preWeekEndPrice: 6900,
        extraGuestWeekDay: 1000,
        extraGuestWeekEnd: 1000,
        extraGuestPreWeekEnd: 1000,
      },
    },
  ],
  rooms: [],
} as unknown as WidgetGetResponse;

const banyaConfig = {
  rooms: [
    {
      id: "b1",
      name: "Баня",
      maxCapacity: 8,
      pricePeriod: {
        includedCapacity: 6,
        extraValue: 1000,
        extraType: 0,
      },
    },
  ],
  dailyRooms: [],
} as unknown as WidgetGetResponse;

describe("getRoomGuestLimits", () => {
  it("homes: capacity = included, maxCapacity = max", () => {
    expect(getRoomGuestLimits(homesConfig, "homes", "d1")).toMatchObject({
      maxGuests: 6,
      includedCapacity: 4,
      extraValueFallback: 1000,
    });
  });

  it("banya: includedCapacity from pricePeriod", () => {
    expect(getRoomGuestLimits(banyaConfig, "banya", "b1")).toMatchObject({
      maxGuests: 8,
      includedCapacity: 6,
      extraValueFallback: 1000,
    });
  });
});

describe("listStayNightDates", () => {
  it("lists nights in [checkIn, checkOut)", () => {
    expect(listStayNightDates("2026-10-20", "2026-10-22")).toEqual([
      "2026-10-20",
      "2026-10-21",
    ]);
  });
});

describe("extraGuestRateForNightDate", () => {
  const pp = {
    weekDayPrice: 1,
    weekEndPrice: 1,
    preWeekEndPrice: 1,
    extraGuestWeekDay: 1000,
    extraGuestWeekEnd: 1500,
    extraGuestPreWeekEnd: 1200,
  };

  it("friday uses preWeekEnd", () => {
    // 2026-10-23 is Friday
    expect(extraGuestRateForNightDate("2026-10-23", pp)).toBe(1200);
  });

  it("saturday uses weekEnd", () => {
    expect(extraGuestRateForNightDate("2026-10-24", pp)).toBe(1500);
  });

  it("monday uses weekDay", () => {
    expect(extraGuestRateForNightDate("2026-10-19", pp)).toBe(1000);
  });
});

describe("resolveExtraGuestSurcharge", () => {
  it("homes: (guests − capacity) × rate × nights; included in API total", () => {
    const result = resolveExtraGuestSurcharge({
      config: homesConfig,
      categoryId: "homes",
      roomId: "d1",
      guestCount: 6,
      checkIn: "2026-10-20",
      checkOut: "2026-10-22",
    });
    // 2 extra × 1000 × 2 nights = 4000
    expect(result).toMatchObject({
      extraGuests: 2,
      unitPrice: 1000,
      surcharge: 4000,
      nights: 2,
      includedInRoomTotal: true,
    });
  });

  it("homes: no surcharge within capacity", () => {
    const result = resolveExtraGuestSurcharge({
      config: homesConfig,
      categoryId: "homes",
      roomId: "d1",
      guestCount: 4,
      checkIn: "2026-10-20",
      checkOut: "2026-10-22",
    });
    expect(result.surcharge).toBe(0);
  });

  it("banya: session surcharge not included in API total", () => {
    const result = resolveExtraGuestSurcharge({
      config: banyaConfig,
      categoryId: "banya",
      roomId: "b1",
      guestCount: 8,
      calcMeta: { extraValueForDate: 1000 },
      slotDuration: 3,
    });
    expect(result).toMatchObject({
      extraGuests: 2,
      surcharge: 2000,
      includedInRoomTotal: false,
    });
  });
});
