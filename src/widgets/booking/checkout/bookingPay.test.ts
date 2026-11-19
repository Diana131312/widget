import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyCertificatePayment,
  checkBookingCertificate,
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
  });
});
