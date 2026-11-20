import { describe, expect, it, vi } from "vitest";
import {
  certificatePromoMessage,
  checkCertificatePromo,
  parseCertificatePromo,
  certificatePurchaseOutcome,
  saveCertificatePurchase,
} from "./certificateApi";

describe("parseCertificatePromo", () => {
  it("reads the discount and the certificate types it covers", () => {
    expect(
      parseCertificatePromo({
        discount: 10,
        reason: "ok",
        certificateTypeIds: ["a", "b"],
      })
    ).toMatchObject({
      discount: 10,
      reason: "ok",
      certificateTypeIds: ["a", "b"],
    });
  });
});

describe("certificatePromoMessage", () => {
  it("explains why a code was rejected", () => {
    expect(
      certificatePromoMessage({
        discount: 0,
        reason: "wrong_date",
        certificateTypeIds: [],
        dateFrom: "2026-01-01",
        dateTo: "2026-01-31",
      })
    ).toBe("Промокод действует с 01.01.2026 по 31.01.2026");
    expect(
      certificatePromoMessage({
        discount: 0,
        reason: "not_found",
        certificateTypeIds: [],
        dateFrom: null,
        dateTo: null,
      })
    ).toBe("Такого промокода нет или он выключен");
  });
});

describe("checkCertificatePromo", () => {
  it("posts the alias, code and selected types", async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          discount: 10,
          reason: "ok",
          certificateTypeIds: ["cert-1"],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await checkCertificatePromo({
      promoCode: "SALE10",
      certificateTypeIds: ["cert-1"],
      alias: "les",
      fetcher,
    });

    expect(result.discount).toBe(10);
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(String(url)).toContain("/promo-code/check-certificates");
    expect(JSON.parse(String(init?.body))).toEqual({
      alias: "les",
      promoCode: "SALE10",
      certificateTypeIds: ["cert-1"],
    });
  });
});

describe("certificatePurchaseOutcome", () => {
  it("treats a paid order without a link as already paid", () => {
    expect(
      certificatePurchaseOutcome({
        amount: 0,
        paymentLink: null,
        paid: true,
      })
    ).toBe("paid");
  });

  it("still asks for a link when the order is not paid", () => {
    expect(
      certificatePurchaseOutcome({ amount: 1000, paymentLink: null, paid: false })
    ).toBe("missing-link");
    expect(certificatePurchaseOutcome({ amount: 1000, paymentLink: "" })).toBe(
      "missing-link"
    );
  });

  it("follows the payment link when the order still needs payment", () => {
    expect(
      certificatePurchaseOutcome({
        amount: 4500,
        paymentLink: " https://pay.example/cert ",
        paid: false,
      })
    ).toBe("redirect");
  });
});

describe("saveCertificatePurchase", () => {
  it("sends the purchase and includes a promo code only when it was accepted", async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          amount: 4500,
          paymentLink: "https://pay.example/cert",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const saved = await saveCertificatePurchase({
      alias: "les",
      name: "Иван Петров",
      phone: "+79001234567",
      email: "ivan@mail.ru",
      recipientName: "Анна",
      messenger: "whatsapp",
      promoCode: "SALE10",
      certificates: [{ id: "cert-1", count: 2 }],
      fetcher,
    });

    expect(saved.paymentLink).toBe("https://pay.example/cert");
    const [, init] = fetcher.mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      alias: "les",
      name: "Иван Петров",
      phone: "+79001234567",
      email: "ivan@mail.ru",
      recipientName: "Анна",
      messenger: "whatsapp",
      promoCode: "SALE10",
      certificates: [{ id: "cert-1", count: 2 }],
    });
  });
});
