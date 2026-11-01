import type { RoomTimeSlot } from "../../../api";
import { isPromoHourGiftComment } from "./banyaSlotVariants";

const PERCENT_DISCOUNT_RE = /(\d+(?:[.,]\d+)?)\s*%/;
const DISCOUNT_WORD_RE = /скидк/i;

/**
 * Цена слота без акции — для зачёркнутой цены.
 * Бэк отдаёт только итоговую цену, поэтому восстанавливаем по comment:
 * - «Час в подарок»: оплачено (N−1) ч → без акции N ч = price / (N−1) × N;
 * - «… 20% скидка …»: price — это 80% → без скидки = price / (1 − 0.2).
 * Нет акции или не распознали → null.
 */
export function estimateSlotPriceBeforeDiscount(
  slot: Pick<RoomTimeSlot, "price" | "duration" | "comment">
): number | null {
  const price = Number(slot.price);
  if (!Number.isFinite(price) || price <= 0) return null;
  const comment = (slot.comment ?? "").trim();
  if (!comment) return null;

  if (isPromoHourGiftComment(comment)) {
    const hours = Number(slot.duration);
    if (!Number.isFinite(hours) || hours <= 1) return null;
    return Math.round((price / (hours - 1)) * hours);
  }

  if (DISCOUNT_WORD_RE.test(comment)) {
    const m = comment.match(PERCENT_DISCOUNT_RE);
    const pct = m ? Number(m[1].replace(",", ".")) : NaN;
    if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) return null;
    return Math.round(price / (1 - pct / 100));
  }

  return null;
}
