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
  it("shows the prepay after the total when payment is partial", () => {
    render(<BookingPriceBreakdown {...base} paymentMode="prepay" promoPercent={15} />);
    expect(screen.getByText("К оплате")).toBeInTheDocument();
    expect(screen.getByText(/1[\s\u00a0]?102,5/)).toBeInTheDocument();
    expect(screen.getByText("−15%")).toBeInTheDocument();
    expect(screen.getByText("−10%")).toBeInTheDocument();
  });

  it("shows the full total when payment is full", () => {
    render(<BookingPriceBreakdown {...base} paymentMode="full" />);
    expect(screen.getByText("К оплате")).toBeInTheDocument();
    expect(screen.getAllByText(/2[\s\u00a0]?205/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/1[\s\u00a0]?102,5/)).not.toBeInTheDocument();
  });
});
