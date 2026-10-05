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
      useBookingFlow({ initial: DEFAULT_BOOKING_URL_STATE })
    );

    act(() => {
      result.current.selectCategory("homes");
    });
    act(() => {
      result.current.selectHome({
        roomId: "d1",
        checkIn: "2026-10-10",
        checkOut: "2026-10-12",
      });
    });
    act(() => {
      result.current.back();
    });

    expect(result.current.stepId).toBe("object");
    expect(result.current.categoryId).toBe("homes");
    // шли из списка (не deep-link) → room id сбрасывается
    expect(result.current.roomId).toBeNull();
    expect(result.current.checkIn).toBeNull();
  });

  it("back from setup keeps room when entered via deep-link pin", () => {
    const { result } = renderHook(() =>
      useBookingFlow({
        initial: {
          ...DEFAULT_BOOKING_URL_STATE,
          stepId: "object",
          categoryId: "banya",
          roomId: "b1",
        },
      })
    );

    act(() => {
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
      result.current.back();
    });

    expect(result.current.stepId).toBe("object");
    expect(result.current.roomId).toBe("b1");
    expect(result.current.banyaDate).toBeNull();
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
          guestCount: 4,
          productQuantities: { p1: 2 },
        },
        { duration: 3, price: 4500 }
      );
    });

    expect(result.current).toMatchObject({
      stepId: "setup",
      slotDuration: 3,
      slotPrice: 4500,
      basePrice: 4500,
      guestCount: 4,
      productQuantities: { p1: 2 },
    });
  });

  it("setGuestCount persists guests in snapshot", () => {
    const onPersist = vi.fn();
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
        onPersist,
      })
    );

    act(() => {
      result.current.setGuestCount(3);
    });

    expect(result.current.guestCount).toBe(3);
    expect(onPersist.mock.calls.at(-1)?.[0]).toMatchObject({
      stepId: "setup",
      guestCount: 3,
    });
  });

  it("setProductQty persists products in snapshot", () => {
    const onPersist = vi.fn();
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
        onPersist,
      })
    );

    act(() => {
      result.current.setProductQty("p1", 2);
    });

    expect(result.current.productQuantities).toEqual({ p1: 2 });
    expect(onPersist.mock.calls.at(-1)?.[0]).toMatchObject({
      productQuantities: { p1: 2 },
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

  it("checkout → verify → done; back from verify/done returns to checkout", () => {
    const { result } = renderHook(() =>
      useBookingFlow({
        initial: {
          ...DEFAULT_BOOKING_URL_STATE,
          stepId: "checkout",
          categoryId: "banya",
          roomId: "b1",
          banyaDate: "2026-10-07",
          banyaTimeFrom: "12:00",
          banyaTimeTo: "15:00",
          guestCount: 1,
        },
      })
    );

    act(() => {
      result.current.continueFromCheckout({
        firstName: "Иван",
        lastName: "Петров",
        phone: "+7 (900) 123-45-67",
        comment: "",
        verifyChannel: "telegram",
      });
    });
    expect(result.current.stepId).toBe("verify");
    expect(result.current.contactDraft?.firstName).toBe("Иван");

    act(() => {
      result.current.back();
    });
    expect(result.current.stepId).toBe("checkout");

    act(() => {
      result.current.continueFromCheckout({
        firstName: "Иван",
        lastName: "Петров",
        phone: "+7 (900) 123-45-67",
        comment: "",
        verifyChannel: "telegram",
      });
      result.current.completeBooking({
        bookingId: "bk1",
        price: 5000,
        prepayment: 2000,
        paymentLink: null,
        timeoutMinutes: 30,
        message: "ok",
        totalFallback: 5000,
      });
    });
    expect(result.current.stepId).toBe("done");

    act(() => {
      result.current.back();
    });
    expect(result.current.stepId).toBe("checkout");
    expect(result.current.bookingResult).toBeNull();
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
