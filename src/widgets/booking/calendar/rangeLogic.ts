import type { DailyDateRange } from "./dailyTypes";
import { countNights } from "./services";

export type RangeDraft = {
  start: string | null;
  end: string | null;
};

export type RangeLimits = {
  minNights?: number | null;
  maxNights?: number | null;
};

export type RangeClickResult = {
  draft: RangeDraft;
  rangeError: string | null;
};

/** Ночи [checkIn, checkOut) пересекаются с occupied. */
export function hasOccupiedNightsBetween(
  checkIn: string,
  checkOut: string,
  occupiedNights: Set<string>
): boolean {
  if (checkOut <= checkIn) return true;
  for (const night of occupiedNights) {
    if (night >= checkIn && night < checkOut) return true;
  }
  return false;
}

function nightsLimitError(
  nights: number,
  limits?: RangeLimits | null
): string | null {
  const min = limits?.minNights;
  const max = limits?.maxNights;
  if (typeof min === "number" && min > 0 && nights < min) {
    return `Минимум ${min} ${nightsWord(min)}`;
  }
  if (typeof max === "number" && max > 0 && nights > max) {
    return `Максимум ${max} ${nightsWord(max)}`;
  }
  return null;
}

function nightsWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "ночь";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "ночи";
  return "ночей";
}

/**
 * Клик по дню в range-календаре домов.
 * Прошедшие даты отфильтровывает вызывающий код.
 */
export function applyRangeDayClick(
  draft: RangeDraft,
  dateStr: string,
  occupiedNights: Set<string>,
  limits?: RangeLimits | null
): RangeClickResult {
  if (!draft.start || (draft.start && draft.end)) {
    return {
      draft: { start: dateStr, end: null },
      rangeError: null,
    };
  }

  const [checkIn, checkOut] =
    dateStr >= draft.start ? [draft.start, dateStr] : [dateStr, draft.start];

  if (checkIn === checkOut) {
    return {
      draft: { start: checkIn, end: null },
      rangeError: null,
    };
  }

  if (hasOccupiedNightsBetween(checkIn, checkOut, occupiedNights)) {
    return {
      draft: { start: dateStr, end: null },
      rangeError: null,
    };
  }

  const nights = countNights(checkIn, checkOut);
  const limitMsg = nightsLimitError(nights, limits);
  if (limitMsg) {
    return {
      draft: { start: dateStr, end: null },
      rangeError: limitMsg,
    };
  }

  return {
    draft: { start: checkIn, end: checkOut },
    rangeError: null,
  };
}

/** Черновик → валидный диапазон для «Далее», либо null. */
export function draftToSelectedRange(
  draft: RangeDraft,
  occupiedNights: Set<string>,
  limits?: RangeLimits | null
): DailyDateRange | null {
  if (!draft.start || !draft.end) return null;
  const nights = countNights(draft.start, draft.end);
  if (nights < 1) return null;
  if (hasOccupiedNightsBetween(draft.start, draft.end, occupiedNights)) {
    return null;
  }
  if (nightsLimitError(nights, limits)) return null;
  return {
    checkIn: draft.start,
    checkOut: draft.end,
    nights,
  };
}

export function isCompleteRange(
  draft: RangeDraft,
  occupiedNights: Set<string>,
  limits?: RangeLimits | null
): boolean {
  return draftToSelectedRange(draft, occupiedNights, limits) != null;
}
