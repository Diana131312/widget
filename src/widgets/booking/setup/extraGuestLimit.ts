/**
 * Временный потолок qty «доп. гость» на клиенте.
 *
 * TODO(prod): перед продом в админке выставить корректные лимиты
 * (max quantity) для товаров «доп. гость» по объектам — виджет
 * должен брать лимит из конфига/товара, а не хардкодить.
 * Сейчас формула capacity/maxCapacity на бэке/в данных ненадёжна.
 */
export const EXTRA_GUEST_HARD_LIMIT = 2;

/**
 * Лимит товара «доп. гость» (MVP: фиксированный потолок).
 * guestCount ≤ 0 → 0; иначе EXTRA_GUEST_HARD_LIMIT.
 */
export function getMaxExtraGuests(guestCount: number): number {
  if (guestCount <= 0) return 0;
  return EXTRA_GUEST_HARD_LIMIT;
}
