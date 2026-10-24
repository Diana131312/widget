import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_BOOKING_URL_STATE } from "../url/bookingUrl";
import {
  isSameSlot,
  readPendingBooking,
  savePendingBooking,
  withPaymentDeadline,
} from "./pendingBooking";

const NOW = Date.parse("2026-10-24T12:00:00Z");

const state = {
  ...DEFAULT_BOOKING_URL_STATE,
  stepId: "done" as const,
  categoryId: "banya" as const,
  roomId: "b1",
  banyaDate: "2026-10-30",
  banyaTimeFrom: "12:00",
  banyaTimeTo: "15:00",
  guestCount: 2,
};

const contact = {
  firstName: "Иван",
  lastName: "Петров",
  phone: "+7 (900) 123-45-67",
  comment: "",
  verifyChannel: "telegram" as const,
};

const result = {
  bookingId: "bk1",
  price: 5000,
  prepayment: 2000,
  paymentLink: "https://pay.example/1",
  timeoutMinutes: 30,
  message: "",
  totalFallback: 5000,
};

describe("pendingBooking", () => {
  beforeEach(() => sessionStorage.clear());

  it("adds deadline once and keeps existing", () => {
    const r = withPaymentDeadline(result, NOW);
    expect(r.expiresAtMs).toBe(NOW + 30 * 60 * 1000);
    expect(withPaymentDeadline(r, NOW + 5000).expiresAtMs).toBe(r.expiresAtMs);
  });

  it("restores until deadline, then drops", () => {
    const r = withPaymentDeadline(result, NOW);
    savePendingBooking({ state, contact, result: r }, sessionStorage);
    expect(readPendingBooking(sessionStorage, NOW + 60_000)?.result.bookingId).toBe(
      "bk1"
    );
    expect(readPendingBooking(sessionStorage, NOW + 31 * 60 * 1000)).toBeNull();
    expect(readPendingBooking(sessionStorage, NOW)).toBeNull();
  });

  it("does not store booking without payment link", () => {
    savePendingBooking(
      { state, contact, result: withPaymentDeadline({ ...result, paymentLink: null }, NOW) },
      sessionStorage
    );
    expect(readPendingBooking(sessionStorage, NOW)).toBeNull();
  });

  it("matches same banya slot only", () => {
    expect(isSameSlot(state, state)).toBe(true);
    expect(isSameSlot(state, { ...state, banyaTimeFrom: "15:00" })).toBe(false);
    expect(isSameSlot(state, { ...state, roomId: "b2" })).toBe(false);
  });
});
