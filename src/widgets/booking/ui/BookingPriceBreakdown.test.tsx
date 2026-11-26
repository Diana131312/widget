import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  applyKnownPromoPercent,
  BookingPriceBreakdown,
} from "./BookingPriceBreakdown";

const base = {
  categoryId: "homes" as const,
  roomName: "Мята",
  guestCount: 1,
  basePrice: 4900,
  productLines: [],
  total: 2205,
  banyaDate: null,
  banyaTimeFrom: null,
  banyaTimeTo: null,
  checkIn: "2027-04-01",
  checkOut: "2027-04-02",
  prepaymentAmount: 1102.5,
  discountAmount: 2695,
  discountText: 'Промокод "ТЕСТДИАНА" + Для двоих (-10%)',
};

describe("applyKnownPromoPercent", () => {
  it("adds the checked percent to the promo line", () => {
    expect(
      applyKnownPromoPercent(
        [
          { name: 'Промокод "ТЕСТДИАНА"', percent: null },
          { name: "Для двоих", percent: "−10%" },
        ],
        15
      )
    ).toEqual([
      { name: 'Промокод "ТЕСТДИАНА"', percent: "−15%" },
      { name: "Для двоих", percent: "−10%" },
    ]);
  });
});

describe("BookingPriceBreakdown due line", () => {
  it("shows the full total, prepay and amount due when payment is partial", () => {
    render(<BookingPriceBreakdown {...base} paymentMode="prepay" promoPercent={15} />);
    expect(screen.getByText("Итого")).toBeInTheDocument();
    expect(screen.getByText("Предоплата")).toBeInTheDocument();
    expect(screen.getByText("К оплате")).toBeInTheDocument();
    expect(screen.getByText(/2[\s\u00a0]?205/)).toBeInTheDocument();
    expect(screen.getAllByText(/1[\s\u00a0]?102,5/).length).toBeGreaterThan(0);
    expect(screen.getByText("−15%")).toBeInTheDocument();
    expect(screen.getByText("−10%")).toBeInTheDocument();
  });

  it("subtracts a certificate from the total and the amount due", () => {
    render(
      <BookingPriceBreakdown
        {...base}
        paymentMode="full"
        certificateBalance={1000}
      />
    );
    const text = document.body.textContent ?? "";
    expect(text.indexOf("Итого")).toBeLessThan(text.indexOf("Сертификат"));
    expect(text.indexOf("Сертификат")).toBeLessThan(text.indexOf("К оплате"));
    expect(screen.getByText("Сертификат").parentElement).toHaveClass(
      "booking-price-breakdown__certificate"
    );
    expect(screen.getByText(/−1[\s\u00a0]?000/)).toBeInTheDocument();
    expect(screen.getAllByText(/2[\s\u00a0]?205/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1[\s\u00a0]?205/).length).toBeGreaterThan(0);
  });

  it("puts a bold certificate between prepay and the amount due", () => {
    render(
      <BookingPriceBreakdown
        {...base}
        paymentMode="prepay"
        certificateBalance={1000}
      />
    );
    const text = document.body.textContent ?? "";
    expect(text.indexOf("Итого")).toBeLessThan(text.indexOf("Предоплата"));
    expect(text.indexOf("Предоплата")).toBeLessThan(text.indexOf("Сертификат"));
    expect(text.indexOf("Сертификат")).toBeLessThan(text.indexOf("К оплате"));
    expect(screen.getByText("Итого").parentElement).toHaveTextContent(/2[\s\u00a0]?205/);
    expect(screen.getByText("Предоплата").parentElement).toHaveTextContent(
      /1[\s\u00a0]?102,5/
    );
    expect(screen.getByText("К оплате").parentElement).toHaveTextContent(/102,5/);
  });

  it("shows the full total when payment is full", () => {
    render(<BookingPriceBreakdown {...base} paymentMode="full" />);
    expect(screen.getByText("К оплате")).toBeInTheDocument();
    expect(screen.getAllByText(/2[\s\u00a0]?205/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/1[\s\u00a0]?102,5/)).not.toBeInTheDocument();
  });
});
