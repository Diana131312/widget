import type {
  CalculateRoomResponse,
  DailyCalculateResponse,
} from "../../../api";

export type CalcMoneyLine = { label: string; amount: number };

export type BanyaCalculateView = {
  /** Итоговая стоимость (без товаров) — поле total */
  total: number;
  /** Сумма до скидок — поле amount */
  amountBeforeDiscount: number | null;
  basePrice: number | null;
  discountAmount: number | null;
  /** Доплата за каждого гостя сверх вместимости */
  extraValueForDate: number | null;
  /** Предоплата за баню из /calculate */
  prepay: number | null;
  /** Предоплата уже включает доп. товары */
  prepayIncludesProducts: boolean | null;
  lines: CalcMoneyLine[];
  raw: CalculateRoomResponse;
};

export type HomesCalculateView = {
  total: number;
  nights: number;
  nightPrices: { date: string; price: number }[];
  periodMessage: string | null;
  raw: DailyCalculateResponse;
};

/** Мета расчёта, которую тащим на checkout. */
export type SetupCalcMeta = {
  prepay: number | null;
  prepayIncludesProducts: boolean | null;
  extraValueForDate: number | null;
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

function readBoolean(
  obj: Record<string, unknown>,
  keys: string[]
): boolean | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "boolean") return v;
  }
  return null;
}

/**
 * /calculate:
 * - total = стоимость брони (без товаров)
 * - amount = до скидок
 * - prepay = предоплата
 * - extraValueForDate = доплата за гостя сверх вместимости
 */
export function parseBanyaCalculateResponse(
  raw: CalculateRoomResponse
): BanyaCalculateView {
  const o = raw as Record<string, unknown>;
  const total =
    readNumber(o, ["total", "totalPrice", "Total", "TotalPrice"]) ?? 0;
  const amountBeforeDiscount = readNumber(o, ["amount", "Amount"]);
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
  const extraValueForDate = readNumber(o, [
    "extraValueForDate",
    "ExtraValueForDate",
  ]);
  const prepay = readNumber(o, ["prepay", "Prepay", "prepayment", "Prepayment"]);
  const prepayIncludesProducts = readBoolean(o, [
    "prepayIncludesProducts",
    "PrepayIncludesProducts",
  ]);

  if (basePrice == null && amountBeforeDiscount != null && amountBeforeDiscount > 0) {
    basePrice = amountBeforeDiscount;
  }
  if (basePrice == null && total > 0) {
    basePrice = total;
  }

  const lines: CalcMoneyLine[] = [];
  if (basePrice != null && basePrice > 0) {
    lines.push({ label: "Стоимость бани", amount: basePrice });
  }
  if (discountAmount != null && discountAmount !== 0) {
    lines.push({ label: "Скидка", amount: -Math.abs(discountAmount) });
  }

  return {
    total: total > 0 ? total : basePrice ?? 0,
    amountBeforeDiscount,
    basePrice,
    discountAmount,
    extraValueForDate,
    prepay,
    prepayIncludesProducts,
    lines,
    raw,
  };
}

export function parseHomesCalculateResponse(
  raw: DailyCalculateResponse
): HomesCalculateView {
  const o = raw as Record<string, unknown>;
  const total =
    readNumber(o, ["totalPrice", "TotalPrice", "total", "Total"]) ??
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

/** HH:mm или HH:mm:ss → HH:mm:ss для /save */
export function toApiTime(time: string): string {
  const parts = time.trim().split(":");
  if (parts.length >= 3) return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:${parts[2].padStart(2, "0")}`;
  if (parts.length === 2) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:00`;
  }
  return time;
}
