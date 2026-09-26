import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_BOOKING_URL_STATE } from "./url/bookingUrl";
import { useBookingFlow } from "./useBookingFlow";

describe("useBookingFlow", () => {
  it("selectCategory opens object step and clears selection", () => {
    const onPersist = vi.fn();
    const { result } = renderHook(() =>
      useBookingFlow({ initial: DEFAULT_BOOKING_URL_STATE, onPersist })
    );

    act(() => {
      result.current.selectCategory("homes");
    });

    expect(result.current.stepId).toBe("object");
    expect(result.current.categoryId).toBe("homes");
    expect(result.current.roomId).toBeNull();
    expect(onPersist).toHaveBeenCalled();
    expect(onPersist.mock.calls.at(-1)?.[0]).toMatchObject({
      stepId: "object",
      categoryId: "homes",
    });
  });

  it("selectHome goes to setup with dates and guests at 0", () => {
    const { result } = renderHook(() =>
      useBookingFlow({ initial: DEFAULT_BOOKING_URL_STATE })
    );

    act(() => {
      result.current.selectCategory("homes");
      result.current.selectHome({
        roomId: "d1",
        checkIn: "2026-10-10",
        checkOut: "2026-10-12",
      });
    });

    expect(result.current.stepId).toBe("setup");
    expect(result.current.roomId).toBe("d1");
    expect(result.current.checkIn).toBe("2026-10-10");
    expect(result.current.checkOut).toBe("2026-10-12");
    expect(result.current.guestCount).toBe(0);
    expect(result.current.basePrice).toBeNull();
  });

  it("selectBanya stores slot times, duration and price", () => {
    const { result } = renderHook(() =>
      useBookingFlow({ initial: DEFAULT_BOOKING_URL_STATE })
    );

    act(() => {
      result.current.selectCategory("banya");
      result.current.selectBanya({
        roomId: "b1",
        date: "2026-10-07",
        timeFrom: "12:00",
        timeTo: "15:00",
        duration: 3,
        price: 4500,
      });
    });

    expect(result.current).toMatchObject({
      stepId: "setup",
      categoryId: "banya",
      roomId: "b1",
      banyaDate: "2026-10-07",
      banyaTimeFrom: "12:00",
      banyaTimeTo: "15:00",
      slotDuration: 3,
      slotPrice: 4500,
      guestCount: 0,
    });
  });

  it("back from setup returns to object and clears dates", () => {
    const { result } = renderHook(() =>
      useBookingFlow({
        initial: {
          ...DEFAULT_BOOKING_URL_STATE,
          stepId: "setup",
          categoryId: "homes",
          roomId: "d1",
          checkIn: "2026-10-10",
          checkOut: "2026-10-12",
        },
      })
    );

    act(() => {
      result.current.back();
    });

    expect(result.current.stepId).toBe("object");
    expect(result.current.categoryId).toBe("homes");
    expect(result.current.roomId).toBeNull();
    expect(result.current.checkIn).toBeNull();
  });

  it("hydrate can restore slot duration and price from validate", () => {
    const { result } = renderHook(() =>
      useBookingFlow({ initial: DEFAULT_BOOKING_URL_STATE })
    );

    act(() => {
      result.current.hydrate(
        {
          ...DEFAULT_BOOKING_URL_STATE,
          stepId: "setup",
          categoryId: "banya",
          roomId: "b1",
          banyaDate: "2026-10-07",
          banyaTimeFrom: "12:00",
          banyaTimeTo: "15:00",
        },
        { duration: 3, price: 4500 }
      );
    });

    expect(result.current).toMatchObject({
      stepId: "setup",
      slotDuration: 3,
      slotPrice: 4500,
    });
  });

  it("hydrate without slotMeta clears duration and price", () => {
    const { result } = renderHook(() =>
      useBookingFlow({ initial: DEFAULT_BOOKING_URL_STATE })
    );

    act(() => {
      result.current.selectCategory("banya");
      result.current.selectBanya({
        roomId: "b1",
        date: "2026-10-07",
        timeFrom: "12:00",
        timeTo: "15:00",
        duration: 3,
        price: 4500,
      });
    });

    act(() => {
      result.current.hydrate({
        ...DEFAULT_BOOKING_URL_STATE,
        stepId: "object",
        categoryId: "banya",
      });
    });

    expect(result.current.stepId).toBe("object");
    expect(result.current.categoryId).toBe("banya");
    expect(result.current.slotDuration).toBeNull();
    expect(result.current.slotPrice).toBeNull();
  });

  it("continueFromSetup goes to checkout (extras skipped)", () => {
    const { result } = renderHook(() =>
      useBookingFlow({
        initial: {
          ...DEFAULT_BOOKING_URL_STATE,
          stepId: "setup",
          categoryId: "banya",
          roomId: "b1",
          banyaDate: "2026-10-07",
          banyaTimeFrom: "12:00",
          banyaTimeTo: "15:00",
        },
      })
    );

    act(() => {
      result.current.continueFromSetup();
    });

    expect(result.current.stepId).toBe("checkout");
  });

  it("goToStep only allows past steps", () => {
    const { result } = renderHook(() =>
      useBookingFlow({
        initial: {
          ...DEFAULT_BOOKING_URL_STATE,
          stepId: "setup",
          categoryId: "homes",
          roomId: "d1",
          checkIn: "2026-10-10",
          checkOut: "2026-10-12",
        },
      })
    );

    act(() => {
      result.current.goToStep("setup");
    });
    expect(result.current.stepId).toBe("setup");

    act(() => {
      result.current.goToStep("checkout");
    });
    expect(result.current.stepId).toBe("setup");

    act(() => {
      result.current.goToStep("category");
    });
    expect(result.current.stepId).toBe("category");
    expect(result.current.categoryId).toBeNull();
    expect(result.current.roomId).toBeNull();
  });
});
