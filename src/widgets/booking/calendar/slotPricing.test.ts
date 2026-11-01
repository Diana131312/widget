import { describe, expect, it } from "vitest";
import { estimateSlotPriceBeforeDiscount } from "./slotPricing";

describe("estimateSlotPriceBeforeDiscount", () => {
  it("hour gift: paid N−1 hours → price for N hours", () => {
    expect(
      estimateSlotPriceBeforeDiscount({
        price: 6600,
        duration: 3,
        comment: "Час в подарок",
      })
    ).toBe(9900);
  });

  it("percent discount from promo text", () => {
    expect(
      estimateSlotPriceBeforeDiscount({
        price: 6600,
        duration: 6,
        comment:
          'Акция "6 часов отдыха с 20% скидкой" Отдыхайте больше, платите меньше!',
      })
    ).toBe(8250);
    expect(
      estimateSlotPriceBeforeDiscount({
        price: 8000,
        duration: 6,
        comment: "20% скидка",
      })
    ).toBe(10000);
  });

  it("no promo or unknown text → null", () => {
    expect(
      estimateSlotPriceBeforeDiscount({ price: 5000, duration: 2, comment: "" })
    ).toBeNull();
    expect(
      estimateSlotPriceBeforeDiscount({
        price: 5000,
        duration: 1,
        comment: "Час в подарок",
      })
    ).toBeNull();
    expect(
      estimateSlotPriceBeforeDiscount({
        price: 5000,
        duration: 3,
        comment: "Вечерний",
      })
    ).toBeNull();
  });
});
