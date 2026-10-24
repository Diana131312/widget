/**
 * Лимит доп. гостей = maxGuests − includedCapacity.
 * Доп. гости доступны только после заполнения основных до includedCapacity.
 */

export type GuestCountSplit = {
  /** Обычные гости (в цене), 0…includedCapacity. */
  baseGuests: number;
  /** Доп. гости сверх includedCapacity. */
  extraGuests: number;
  /** Макс. обычных (= includedCapacity). */
  maxBaseGuests: number;
  /** Макс. доп. (= maxGuests − includedCapacity). */
  maxExtraGuests: number;
  /** Можно ли менять доп. гостей. */
  extraUnlocked: boolean;
};

export function splitGuestCount(
  guestCount: number,
  includedCapacity: number,
  maxGuests: number
): GuestCountSplit {
  const maxBase = Math.max(0, Math.floor(includedCapacity));
  const maxTotal = Math.max(maxBase, Math.floor(maxGuests));
  const maxExtra = Math.max(0, maxTotal - maxBase);
  const total = Math.max(0, Math.floor(guestCount));
  const baseGuests = Math.min(total, maxBase);
  const extraGuests = Math.max(0, Math.min(total - maxBase, maxExtra));
  const extraUnlocked = maxBase > 0 && baseGuests >= maxBase && maxExtra > 0;

  return {
    baseGuests,
    extraGuests,
    maxBaseGuests: maxBase,
    maxExtraGuests: maxExtra,
    extraUnlocked,
  };
}

/**
 * Сколько доп. гостей можно выбрать при текущем заполнении основных.
 * Пока основные < includedCapacity → 0; иначе maxGuests − includedCapacity.
 */
export function getMaxExtraGuests(
  guestCount: number,
  includedCapacity: number,
  maxGuests: number
): number {
  return splitGuestCount(guestCount, includedCapacity, maxGuests).extraUnlocked
    ? Math.max(0, Math.floor(maxGuests) - Math.max(0, Math.floor(includedCapacity)))
    : 0;
}
