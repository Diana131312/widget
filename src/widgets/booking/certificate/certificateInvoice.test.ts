import { describe, expect, it } from "vitest";
import { readCertificateInvoiceOrder } from "./certificateInvoice";

describe("readCertificateInvoiceOrder", () => {
  it("uses a booking id for the invoice", () => {
    expect(
      readCertificateInvoiceOrder({
        amount: 5000,
        paymentLink: "https://pay.example/cert",
        bookingId: "bk-1",
        timeoutMinutes: 15,
      })
    ).toEqual({ id: "bk-1", scope: "booking", timeoutMinutes: 15 });
  });

  it("uses an order id when the purchase is not a booking", () => {
    expect(
      readCertificateInvoiceOrder({
        orderId: "ord-1",
        bookingId: "bk-1",
      })
    ).toEqual({ id: "ord-1", scope: "order", timeoutMinutes: null });
  });

  it("returns null when the purchase has no id", () => {
    expect(
      readCertificateInvoiceOrder({ amount: 5000, paymentLink: "https://pay" })
    ).toBeNull();
  });
});
