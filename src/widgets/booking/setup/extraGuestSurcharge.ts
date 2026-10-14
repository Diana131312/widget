/**
 * Доплата за гостей сверх includedCapacity (только для UI-расчёта).
 * В /save отдельным товаром не передаём.
 */

/** extraType: 0 — за сеанс, 1 — за час. */
export type ExtraGuestSurchargeInput = {
  guestCount: number;
  includedCapacity: number;
  /** За одного доп. гостя на дату (extraValueForDate или pricePeriod.extraValue). */
  extraValuePerGuest: number;
  extraType: number;
  durationHours: number;
};

export type ExtraGuestSurchargeResult = {
  extraGuests: number;
  unitPrice: number;
  /** Итоговая доплата за всех доп. гостей. */
  surcharge: number;
};

export function computeExtraGuestSurcharge(
  input: ExtraGuestSurchargeInput
): ExtraGuestSurchargeResult {
  const extraGuests = Math.max(
    0,
    Math.floor(input.guestCount) - Math.max(0, Math.floor(input.includedCapacity))
  );
  const unit = Number(input.extraValuePerGuest);
  if (extraGuests <= 0 || !Number.isFinite(unit) || unit <= 0) {
    return { extraGuests: Math.max(0, extraGuests), unitPrice: 0, surcharge: 0 };
  }

  const hoursFactor =
    input.extraType === 1
      ? Math.max(0, Number(input.durationHours) || 0)
      : 1;

  const surcharge = extraGuests * unit * hoursFactor;
  return {
    extraGuests,
    unitPrice: unit,
    surcharge: Number.isFinite(surcharge) ? surcharge : 0,
  };
}
