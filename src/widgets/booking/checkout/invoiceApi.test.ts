import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatInvoiceDate,
  invoiceBuyerError,
  invoicePdfHref,
  issueInvoice,
  parseInvoiceParties,
} from "./invoiceApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("invoice payment api", () => {
  it("prints the invoice due date as day month year", () => {
    expect(formatInvoiceDate("2026-11-27")).toBe("27.11.2026");
  });

  it("builds an absolute pdf link and keeps a signed query", () => {
    expect(invoicePdfHref("/api/widget/invoice/pdf/les/doc?t=abc")).toBe(
      "https://app.gettime.online/api/widget/invoice/pdf/les/doc?t=abc"
    );
  });

  it("reads company suggestions", () => {
    expect(
      parseInvoiceParties([
        {
          name: "ООО «Ромашка»",
          inn: "7707083893",
          kpp: "773601001",
          address: "г. Москва",
          type: "LEGAL",
        },
      ])
    ).toEqual([
      {
        name: "ООО «Ромашка»",
        inn: "7707083893",
        kpp: "773601001",
        address: "г. Москва",
        type: "LEGAL",
      },
    ]);
  });

  it("asks for kpp only for a 10-digit inn", () => {
    const buyer = {
      name: "ИП Иванов",
      inn: "500100732259",
      kpp: "",
      address: "г. Казань",
      email: "buh@example.com",
    };
    expect(invoiceBuyerError(buyer)).toBeNull();
    expect(invoiceBuyerError({ ...buyer, inn: "7707083893" })).toBe(
      "Укажите КПП (9 цифр)"
    );
  });

  it("issues the full amount for a bath when the offer allows it", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            orderNumber: "1234",
            prepayAmount: 3000,
            fullAmount: 10000,
            paymentDays: 3,
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            documentId: "doc-1",
            number: "15",
            date: "2026-11-25",
            dueDate: "2026-11-30",
            amount: 10000,
            buyerName: "ООО «Ромашка»",
            pdfUrl: "/api/widget/invoice/pdf/les/doc-1?t=sign",
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    const document = await issueInvoice({
      bookingId: "bk-1",
      daily: false,
      phone: "+7 (999) 123-45-67",
      buyer: {
        name: "ООО «Ромашка»",
        inn: "7707083893",
        kpp: "773601001",
        address: "г. Москва, ул. Ленина, д. 1",
        email: "buh@example.com",
      },
    });

    expect(document.number).toBe("15");
    expect(fetchMock.mock.calls[1][0]).toContain("/invoice/create");
    const body = JSON.parse(String(fetchMock.mock.calls[1][1].body));
    expect(body).toMatchObject({
      alias: "les",
      bookingIds: ["bk-1"],
      phone: "+79991234567",
      mode: "full",
    });
    expect(body.dailyBookingIds).toBeUndefined();
  });

  it("shows the server error text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Оплата по счёту недоступна", { status: 400 }))
    );
    await expect(
      issueInvoice({
        bookingId: "bk-1",
        daily: true,
        phone: "+79991234567",
        buyer: {
          name: "ООО «Ромашка»",
          inn: "7707083893",
          kpp: "773601001",
          address: "г. Москва",
          email: "buh@example.com",
        },
      })
    ).rejects.toThrow("Оплата по счёту недоступна");
  });
});
