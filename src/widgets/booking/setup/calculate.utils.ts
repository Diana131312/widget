import type {
  CalculateRoomResponse,
  DailyCalculateResponse,
} from "../../../api";

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

/** API иногда отдаёт числа строками — иначе total=0 и расчёт «ломается». */
function readNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v.replace(/\s/g, "").replace(",", "."));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

export function parseBanyaCalculateResponse(
  raw: CalculateRoomResponse
): BanyaCalculateView {
  const o = raw as Record<string, unknown>;
  const total =
    readNumber(o, [
      "total",
      "totalPrice",
      "Total",
      "TotalPrice",
      "amount",
      "Amount",
      "sum",
      "Sum",
    ]) ?? 0;
  let basePrice = readNumber(o, [
    "basePrice",
    "BasePrice",
    "price",
    "Price",
    "roomPrice",
    "RoomPrice",
  ]);
  const discountAmount = readNumber(o, [
    "discountAmount",
    "DiscountAmount",
    "discount",
    "Discount",
  ]);

  if (basePrice == null && total > 0) {
    basePrice = total;
  }

  const lines: { label: string; amount: number }[] = [];
  if (basePrice != null && basePrice > 0) {
    lines.push({ label: "Стоимость бани", amount: basePrice });
  }
  if (discountAmount != null && discountAmount !== 0) {
    lines.push({ label: "Скидка", amount: -Math.abs(discountAmount) });
  }

  return {
    total: total > 0 ? total : basePrice ?? 0,
    basePrice,
    discountAmount,
    lines,
    raw,
  };
}

export function parseHomesCalculateResponse(
  raw: DailyCalculateResponse
): HomesCalculateView {
  const o = raw as Record<string, unknown>;
  const total =
    readNumber(o, ["totalPrice", "TotalPrice", "total", "Total", "amount"]) ??
    raw.totalPrice ??
    0;

  return {
    total,
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

export function computeDurationHours(timeFrom: string, timeTo: string): number {
  const [fromH, fromM] = timeFrom.split(":").map(Number);
  const [toH, toM] = timeTo.split(":").map(Number);
  const from = fromH * 60 + (fromM || 0);
  const to = toH * 60 + (toM || 0);
  const diff = to - from;
  return diff > 0 ? diff / 60 : 1;
}
