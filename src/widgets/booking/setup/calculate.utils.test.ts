import { describe, expect, it } from "vitest";
import {
  computeDurationHours,
  parseBanyaCalculateResponse,
  parseHomesCalculateResponse,
} from "./calculate.utils";

describe("computeDurationHours", () => {
  it("computes hours from wall-clock times", () => {
    expect(computeDurationHours("12:00", "15:00")).toBe(3);
    expect(computeDurationHours("10:30", "12:00")).toBe(1.5);
  });

  it("falls back to 1 when to <= from", () => {
    expect(computeDurationHours("15:00", "12:00")).toBe(1);
    expect(computeDurationHours("12:00", "12:00")).toBe(1);
  });
});

describe("parseBanyaCalculateResponse", () => {
  it("reads total/basePrice and builds bath line", () => {
    const view = parseBanyaCalculateResponse({
      total: 4500,
      basePrice: 4500,
    } as never);
    expect(view.total).toBe(4500);
    expect(view.basePrice).toBe(4500);
    expect(view.lines).toEqual([
      { label: "Стоимость бани", amount: 4500 },
    ]);
  });

  it("uses total as base when basePrice missing", () => {
    const view = parseBanyaCalculateResponse({ total: 3200 } as never);
    expect(view.basePrice).toBe(3200);
    expect(view.lines[0]).toEqual({
      label: "Стоимость бани",
      amount: 3200,
    });
  });

  it("coerces string totals (API quirk regression)", () => {
    const view = parseBanyaCalculateResponse({
      total: "4 500",
      basePrice: "4500",
    } as never);
    expect(view.total).toBe(4500);
    expect(view.basePrice).toBe(4500);
  });

  it("includes discount line when present", () => {
    const view = parseBanyaCalculateResponse({
      total: 4000,
      basePrice: 4500,
      discountAmount: 500,
    } as never);
    expect(view.lines).toEqual([
      { label: "Стоимость бани", amount: 4500 },
      { label: "Скидка", amount: -500 },
    ]);
  });

  it("reads amount as before-discount, not as total", () => {
    const view = parseBanyaCalculateResponse({
      total: 4000,
      amount: 4500,
      discount: 500,
    } as never);
    expect(view.total).toBe(4000);
    expect(view.amountBeforeDiscount).toBe(4500);
    expect(view.discountAmount).toBe(500);
  });

  it("reads prepay and extraValueForDate", () => {
    const view = parseBanyaCalculateResponse({
      total: 0,
      amount: 0,
      prepay: 3000,
      prepayIncludesProducts: false,
      extraValueForDate: 1000,
    } as never);
    expect(view.prepay).toBe(3000);
    expect(view.prepayIncludesProducts).toBe(false);
    expect(view.extraValueForDate).toBe(1000);
  });

  it("does not treat amount alone as total when total missing", () => {
    const view = parseBanyaCalculateResponse({ amount: 3200 } as never);
    // amount = до скидок; без total берём его как базу, не путаем с предоплатой
    expect(view.amountBeforeDiscount).toBe(3200);
    expect(view.basePrice).toBe(3200);
    expect(view.total).toBe(3200);
  });

  it("returns zero total when API empty", () => {
    const view = parseBanyaCalculateResponse({} as never);
    expect(view.total).toBe(0);
    expect(view.lines).toEqual([]);
  });
});

describe("parseHomesCalculateResponse", () => {
  it("maps night prices and total", () => {
    const view = parseHomesCalculateResponse({
      nights: 2,
      nightPrices: [
        { date: "2026-10-10", price: 5000 },
        { date: "2026-10-11", price: 5500 },
      ],
      totalPrice: 10500,
      periodMessage: "мин. 2 ночи",
    } as never);
    expect(view).toMatchObject({
      total: 10500,
      nights: 2,
      periodMessage: "мин. 2 ночи",
    });
    expect(view.nightPrices).toHaveLength(2);
  });
});
