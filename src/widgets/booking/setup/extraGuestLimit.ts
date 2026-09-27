/**
 * Временный потолок qty «доп. гость» на клиенте.
 *
 * TODO(prod): перед продом в админке выставить корректные лимиты
 * (max quantity) для товаров «доп. гость» по объектам — виджет
 * должен брать лимит из конфига/товара, а не хардкодить.
 */
export const EXTRA_GUEST_HARD_LIMIT = 2;

/**
 * Доп. гости доступны только после заполнения основных до maxGuests.
 * guestCount < maxGuests → 0; иначе EXTRA_GUEST_HARD_LIMIT (2).
 */
export function getMaxExtraGuests(
  guestCount: number,
  maxGuests: number
): number {
  if (guestCount <= 0) return 0;
  if (guestCount < maxGuests) return 0;
  return EXTRA_GUEST_HARD_LIMIT;
}
