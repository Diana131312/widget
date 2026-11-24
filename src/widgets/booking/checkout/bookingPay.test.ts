import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyCertificatePayment,
  bookingPromoMessage,
  certificateCoverageText,
  checkBookingCertificate,
  checkBookingPromo,
  payBookingWithCertificate,
} from "./bookingPay";
import type { BookingResultDraft } from "./checkoutDraft";

const meta: BookingResultDraft = {
  bookingId: "bk-1",
  price: 7000,
  prepayment: 3500,
  paymentLink: "https://pay.example/card",
  timeoutMinutes: 15,
  message: "Спасибо",
  totalFallback: 7000,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("checkBookingPromo", () => {
  it("asks with the room and the booking date", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ discount: 10, reason: "ok" })
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      checkBookingPromo({
        promoCode: "PROMO10",
        roomId: "room-1",
        date: "2026-03-15",
      })
    ).resolves.toMatchObject({ discount: 10, reason: "ok" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/promo-code/check");
    expect(JSON.parse(String(init.body))).toEqual({
      roomId: "room-1",
      promoCodeName: "PROMO10",
      date: "2026-03-15",
    });
  });

  it("explains why a code does not fit the stay", () => {
    expect(
      bookingPromoMessage({
        discount: 0,
        reason: "wrong_date",
        dateFrom: "2026-03-01",
        dateTo: "2026-03-31",
        horizonDays: null,
      })
    ).toBe("Промокод действует с 01.03.2026 по 31.03.2026");
    expect(
      bookingPromoMessage({
        discount: 0,
        reason: "wrong_room",
        dateFrom: null,
        dateTo: null,
        horizonDays: null,
      })
    ).toBe("Промокод не действует на выбранную баню или дом");
    expect(
      bookingPromoMessage({
        discount: 0,
        reason: "wrong_horizon",
        dateFrom: null,
        dateTo: null,
        horizonDays: 3,
      })
    ).toBe("Промокод можно применить за 3 дн. до визита");
  });
});

describe("certificateCoverageText", () => {
  it("writes off the certificate and leaves the rest to pay", () => {
    expect(certificateCoverageText(3450, 10000)).toBe(
      "Спишется 3\u00a0450 рублей останется 6\u00a0550 рублей"
    );
    expect(certificateCoverageText(7000, 3000)).toBe(
      "Спишется 3\u00a0000 рублей останется 0 рублей"
    );
  });
});

describe("checkBookingCertificate", () => {
  it("reads name and balance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ name: "Электронный сертификат", balance: 5000 })
      )
    );
    await expect(checkBookingCertificate("123456")).resolves.toEqual({
      name: "Электронный сертификат",
      balance: 5000,
    });
  });

  it("surfaces the 400 text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ message: "Сертификат не найден" }, 400))
    );
    await expect(checkBookingCertificate("000")).rejects.toThrow(
      "Сертификат не найден"
    );
  });
});

describe("payBookingWithCertificate", () => {
  it("keeps the card link when the certificate does not cover prepay", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          paidFully: false,
          certificateUsed: 1000,
          remainingAmount: 2500,
          paymentLink: "https://pay.example/rest",
        })
      )
    );
    const paid = await payBookingWithCertificate({
      bookingId: "bk-1",
      certificateNumber: "123456",
    });
    const next = await applyCertificatePayment(meta, "123456");
    expect(paid.paidFully).toBe(false);
    expect(next.prepayment).toBe(2500);
    expect(next.paymentLink).toBe("https://pay.example/rest");
    expect(next.paidByCertificate).toBe(true);
    expect(next.certificatePaidFully).toBe(false);
  });

  it("clears the payment link when the certificate covers prepay", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ paidFully: true, certificateUsed: 3500 })
      )
    );
    const next = await applyCertificatePayment(meta, "123456");
    expect(next.paymentLink).toBeNull();
    expect(next.prepayment).toBe(0);
    expect(next.paidByCertificate).toBe(true);
    expect(next.certificatePaidFully).toBe(true);
  });
});
