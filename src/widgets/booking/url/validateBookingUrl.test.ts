import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WidgetApiClient, WidgetGetResponse } from "../../../api";
import { DEFAULT_BOOKING_URL_STATE } from "./bookingUrl";
import { validateBookingUrl } from "./validateBookingUrl";

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
      minNights: 2,
      maxNights: 5,
    },
  ],
  rooms: [{ id: "b1", name: "Кедровая" }],
} as unknown as WidgetGetResponse;

const api = {} as WidgetApiClient;

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
      },
      config,
      api
    );
    expect(result).toEqual({
      ok: true,
      state: {
        ...DEFAULT_BOOKING_URL_STATE,
        stepId: "setup",
        categoryId: "homes",
        roomId: "d1",
        checkIn: "2026-10-10",
        checkOut: "2026-10-12",
      },
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
    expect(result.state).toMatchObject({ stepId: "object", categoryId: "homes" });
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
    expect(result.reason).toMatch(/заняты/i);
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
      expect(result.slotMeta).toEqual({ duration: 3, price: 4500 });
    }
  });

  it("rejects unavailable banya slot", async () => {
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
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/недоступен/i);
  });
});
