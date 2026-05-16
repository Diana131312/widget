import type {
  CalculateRoomResponse,
  DailyCalculateResponse,
} from "../../../../api";

export type BanyaCalculateView = {
  total: number;
  basePrice: number | null;
  discountAmount: number | null;
  lines: { label: string; amount: number }[];
  raw: CalculateRoomResponse;
};

export type HomesCalculateView = {
  total: number;
  nights: number;
  nightPrices: { date: string; price: number }[];
  periodMessage: string | null;
  raw: DailyCalculateResponse;
};

function readNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
  }
  return null;
}

export function parseBanyaCalculateResponse(
  raw: CalculateRoomResponse
): BanyaCalculateView {
  const o = raw as Record<string, unknown>;
  const total =
    readNumber(o, ["total", "totalPrice", "Total", "TotalPrice"]) ?? 0;
  const basePrice = readNumber(o, ["basePrice", "BasePrice", "price", "Price"]);
  const discountAmount = readNumber(o, [
    "discountAmount",
    "DiscountAmount",
    "discount",
  ]);

  const lines: { label: string; amount: number }[] = [];
  if (basePrice != null) {
    lines.push({ label: "Базовая стоимость", amount: basePrice });
  }
  if (discountAmount != null && discountAmount !== 0) {
    lines.push({ label: "Скидка", amount: -Math.abs(discountAmount) });
  }

  return {
    total,
    basePrice,
    discountAmount,
    lines,
    raw,
  };
}

export function parseHomesCalculateResponse(
  raw: DailyCalculateResponse
): HomesCalculateView {
  return {
    total: raw.totalPrice ?? 0,
    nights: raw.nights ?? 0,
    nightPrices: Array.isArray(raw.nightPrices)
      ? raw.nightPrices.map((n) => ({
          date: String(n.date),
          price: Number(n.price) || 0,
        }))
      : [],
    periodMessage: raw.periodMessage ?? null,
    raw,
  };
}

export function buildBanyaTestCalculateView(
  label: string,
  price: number
): BanyaCalculateView {
  return {
    total: price,
    basePrice: price,
    discountAmount: null,
    lines: [{ label, amount: price }],
    raw: {} as CalculateRoomResponse,
  };
}

export function computeDurationHours(timeFrom: string, timeTo: string): number {
  const [fromH, fromM] = timeFrom.split(":").map(Number);
  const [toH, toM] = timeTo.split(":").map(Number);
  const from = fromH * 60 + (fromM || 0);
  const to = toH * 60 + (toM || 0);
  const diff = to - from;
  return diff > 0 ? diff / 60 : 1;
}
