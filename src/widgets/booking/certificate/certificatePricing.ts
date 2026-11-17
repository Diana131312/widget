import { formatCertificateAmount } from "./amounts";

/** Верхняя граница количества в одном заказе. */
export const MAX_CERTIFICATE_COUNT = 20;

export function clampCertificateCount(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const count = Math.trunc(value);
  if (count < 1) return 1;
  if (count > MAX_CERTIFICATE_COUNT) return MAX_CERTIFICATE_COUNT;
  return count;
}

export function certificateNominal(price: number, count: number): number {
  return price * clampCertificateCount(count);
}

/**
 * Скидка уменьшает только сумму оплаты.
 * Номинал на сертификате остаётся полным.
 */
export function certificatePayAmount(
  price: number,
  count: number,
  discountPercent: number
): number {
  const nominal = certificateNominal(price, count);
  if (!Number.isFinite(discountPercent) || discountPercent <= 0) return nominal;
  const percent = Math.min(100, discountPercent);
  return Math.round((nominal * (100 - percent)) / 100);
}

export function formatDurationMonths(months: number | null): string {
  if (months == null || !Number.isFinite(months) || months <= 0) {
    return "Бессрочный";
  }
  const count = Math.trunc(months);
  return `Действует ${count} ${monthWord(count)} с дня покупки`;
}

/** Короткий срок для расчёта: «Бессрочный» или «6 месяцев». */
export function formatCertificateTerm(months: number | null): string {
  if (months == null || !Number.isFinite(months) || months <= 0) {
    return "Бессрочный";
  }
  const count = Math.trunc(months);
  return `${count} ${monthWord(count)}`;
}

/** «1 шт 3 000 ₽» или «2 шт × 3 000 ₽ = 6 000 ₽». */
export function formatCertificateQty(count: number, price: number): string {
  const safe = clampCertificateCount(count);
  const unit = `${formatCertificateAmount(price)} ₽`;
  if (safe <= 1) return `1 шт ${unit}`;
  const total = `${formatCertificateAmount(price * safe)} ₽`;
  return `${safe} шт × ${unit} = ${total}`;
}

function monthWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "месяц";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "месяца";
  return "месяцев";
}
