import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WidgetApiClient, WidgetGetResponse } from "../../../api";
import { DEFAULT_BOOKING_URL_STATE } from "./bookingUrl";
import {
  sanitizeSetupExtras,
  validateBookingUrl,
} from "./validateBookingUrl";

vi.mock("../calendar/services", async () => {
  const actual = await vi.importActual<typeof import("../calendar/services")>(
    "../calendar/services"
  );
  return {
    ...actual,
    loadDailyOccupied: vi.fn(),
    loadRoomTimeSlots: vi.fn(),
  };
});

import { loadDailyOccupied, loadRoomTimeSlots } from "../calendar/services";

const config = {
  dailyRooms: [
    {
      id: "d1",
      name: "Мята",
      capacity: 4,
      maxCapacity: 6,
      minNights: 2,
      maxNights: 5,
    },
  ],
  rooms: [{ id: "b1", name: "Кедровая", capacity: 4, maxCapacity: 8 }],
  productGroups: [{ id: "g1", name: "Веники", image: null }],
  products: [
    {
      id: "p1",
      name: "Берёзовый",
      description: null,
      barcode: null,
      image: null,
      price: 500,
      productGroupId: "g1",
      isPublic: true,
      roomIds: ["b1"],
      dailyRoomIds: ["d1"],
    },
    {
      id: "p2",
      name: "Доп. гость",
      description: null,
      barcode: null,
      image: null,
      price: 700,
      productGroupId: "g1",
      isPublic: true,
      roomIds: ["b1"],
      dailyRoomIds: ["d1"],
    },
  ],
} as unknown as WidgetGetResponse;

const api = {} as WidgetApiClient;

describe("sanitizeSetupExtras", () => {
  it("clamps guests and drops unknown products", () => {
    const result = sanitizeSetupExtras(
      {
        ...DEFAULT_BOOKING_URL_STATE,
        categoryId: "banya",
        roomId: "b1",
        guestCount: 99,
        productQuantities: { p1: 2, unknown: 5, p2: 3 },
      },
      config,
      8
    );
    expect(result.guestCount).toBe(8);
    expect(result.productQuantities).toEqual({ p1: 2, p2: 2 });
  });

  it("drops extra guest when below capacity", () => {
    const result = sanitizeSetupExtras(
      {
        ...DEFAULT_BOOKING_URL_STATE,
        categoryId: "banya",
        roomId: "b1",
        guestCount: 3,
        productQuantities: { p2: 2 },
      },
      config,
      8
    );
    expect(result.guestCount).toBe(3);
    expect(result.productQuantities).toEqual({});
  });
});

describe("validateBookingUrl", () => {
  beforeEach(() => {
    vi.mocked(loadDailyOccupied).mockReset();
    vi.mocked(loadRoomTimeSlots).mockReset();
  });

  it("accepts category and object links", async () => {
    await expect(
      validateBookingUrl(DEFAULT_BOOKING_URL_STATE, config, api)
    ).resolves.toEqual({
      ok: true,
      state: DEFAULT_BOOKING_URL_STATE,
    });

    const objectLink = await validateBookingUrl(
      {
        ...DEFAULT_BOOKING_URL_STATE,
        stepId: "object",
        categoryId: "homes",
      },
      config,
      api
    );
    expect(objectLink.ok).toBe(true);
    expect(objectLink.state).toMatchObject({
      stepId: "object",
      categoryId: "homes",
    });
  });

  it("rejects setup without category", async () => {
    const result = await validateBookingUrl(
      { ...DEFAULT_BOOKING_URL_STATE, stepId: "setup" },
      config,
      api
    );
    expect(result.ok).toBe(false);
    expect(result.state.stepId).toBe("category");
    if (!result.ok) expect(result.code).toBe("other");
  });

  it("missing room id on setup goes to category", async () => {
    const result = await validateBookingUrl(
      {
        ...DEFAULT_BOOKING_URL_STATE,
        stepId: "checkout",
        categoryId: "banya",
      },
      config,
      api
    );
    expect(result.ok).toBe(false);
    expect(result.state.stepId).toBe("category");
    if (!result.ok) expect(result.code).toBe("missing_room");
  });

  it("accepts valid homes setup when dates free", async () => {
    vi.mocked(loadDailyOccupied).mockResolvedValue([]);
    const result = await validateBookingUrl(
      {
        ...DEFAULT_BOOKING_URL_STATE,
        stepId: "setup",
        categoryId: "homes",
        roomId: "d1",
        checkIn: "2026-10-10",
        checkOut: "2026-10-12",
        guestCount: 2,
        productQuantities: { p1: 1 },
      },
      config,
      api
    );
    expect(result.ok).toBe(true);
    expect(result.state).toEqual({
      ...DEFAULT_BOOKING_URL_STATE,
      stepId: "setup",
      categoryId: "homes",
      roomId: "d1",
      checkIn: "2026-10-10",
      checkOut: "2026-10-12",
      guestCount: 2,
      productQuantities: { p1: 1 },
    });
  });

  it("rejects homes setup below minNights", async () => {
    const result = await validateBookingUrl(
      {
        ...DEFAULT_BOOKING_URL_STATE,
        stepId: "setup",
        categoryId: "homes",
        roomId: "d1",
        checkIn: "2026-10-10",
        checkOut: "2026-10-11",
      },
      config,
      api
    );
    expect(result.ok).toBe(false);
    expect(result.state).toMatchObject({
      stepId: "object",
      categoryId: "homes",
      roomId: "d1",
    });
    expect(result.reason).toMatch(/минимум/i);
  });

  it("rejects homes setup when occupied", async () => {
    vi.mocked(loadDailyOccupied).mockResolvedValue([
      { startDate: "2026-10-10", endDate: "2026-10-11" },
    ]);
    const result = await validateBookingUrl(
      {
        ...DEFAULT_BOOKING_URL_STATE,
        stepId: "setup",
        categoryId: "homes",
        roomId: "d1",
        checkIn: "2026-10-10",
        checkOut: "2026-10-12",
      },
      config,
      api
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/занят/i);
    if (!result.ok) {
      expect(result.code).toBe("dates_occupied");
      expect(result.state.roomId).toBe("d1");
    }
  });

  it("accepts valid banya slot", async () => {
    vi.mocked(loadRoomTimeSlots).mockResolvedValue([
      {
        timeFrom: "12:00",
        timeTo: "15:00",
        duration: 3,
        price: 4500,
        comment: "Стандарт",
        isAvailable: true,
      },
    ]);
    const result = await validateBookingUrl(
      {
        ...DEFAULT_BOOKING_URL_STATE,
        stepId: "setup",
        categoryId: "banya",
        roomId: "b1",
        banyaDate: "2026-10-07",
        banyaTimeFrom: "12:00",
        banyaTimeTo: "15:00",
      },
      config,
      api
    );
    expect(result.ok).toBe(true);
    expect(result.state).toMatchObject({
      stepId: "setup",
      categoryId: "banya",
      roomId: "b1",
      banyaTimeFrom: "12:00",
    });
    if (result.ok) {
      expect(result.slotMeta).toMatchObject({ duration: 3, price: 4500 });
    }
  });

  it("restores checkout when banya slot free and guests set", async () => {
    vi.mocked(loadRoomTimeSlots).mockResolvedValue([
      {
        timeFrom: "19:00",
        timeTo: "00:00",
        duration: 5,
        price: 6000,
        isAvailable: true,
      },
    ]);
    const result = await validateBookingUrl(
      {
        ...DEFAULT_BOOKING_URL_STATE,
        stepId: "checkout",
        categoryId: "banya",
        roomId: "b1",
        banyaDate: "2026-09-29",
        banyaTimeFrom: "19:00",
        banyaTimeTo: "00:00",
        guestCount: 1,
        productQuantities: { p1: 1 },
      },
      config,
      api
    );
    expect(result.ok).toBe(true);
    expect(result.state).toMatchObject({
      stepId: "checkout",
      guestCount: 1,
      productQuantities: { p1: 1 },
    });
    if (result.ok) {
      expect(result.slotMeta?.basePrice).toBe(6000);
    }
  });

  it("rejects unavailable banya slot and keeps room focus", async () => {
    vi.mocked(loadRoomTimeSlots).mockResolvedValue([
      {
        timeFrom: "12:00",
        timeTo: "15:00",
        duration: 3,
        price: 4500,
        isAvailable: false,
      },
    ]);
    const result = await validateBookingUrl(
      {
        ...DEFAULT_BOOKING_URL_STATE,
        stepId: "checkout",
        categoryId: "banya",
        roomId: "b1",
        banyaDate: "2026-10-07",
        banyaTimeFrom: "12:00",
        banyaTimeTo: "15:00",
        guestCount: 1,
      },
      config,
      api
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/слот времени уже занят/i);
    if (!result.ok) {
      expect(result.code).toBe("slot_occupied");
      expect(result.state).toMatchObject({
        stepId: "object",
        categoryId: "banya",
        roomId: "b1",
      });
    }
  });
});
