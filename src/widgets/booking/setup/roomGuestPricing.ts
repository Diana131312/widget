import { addDays, format, getDay, parseISO } from "date-fns";
import type {
  WidgetDailyRoomPricePeriod,
  WidgetGetResponse,
  WidgetRoom,
} from "../../../api";
import type { BookingCategoryId } from "../types";
import {
  computeDurationHours,
  type SetupCalcMeta,
} from "./calculate.utils";
import {
  computeExtraGuestSurcharge,
  type ExtraGuestSurchargeResult,
} from "./extraGuestSurcharge";

export type RoomGuestLimits = {
  maxGuests: number;
  /** Гостей, уже входящих в цену (бани: includedCapacity; дома: capacity). */
  includedCapacity: number;
  extraType: number;
  extraValueFallback: number;
};

export type ExtraGuestResolveResult = ExtraGuestSurchargeResult & {
  /** Дома: число ночей в доплате. Бани: 0. */
  nights: number;
  /** Все ночи с одинаковым тарифом доп. гостя (для формулы в UI). */
  ratesEqual: boolean;
  /**
   * true — доплата уже внутри total из /daily-calculate.
   * false — /calculate без доплаты, её надо прибавить на клиенте.
   */
  includedInRoomTotal: boolean;
};

export function getBanyaRoom(
  config: WidgetGetResponse,
  roomId: string
): WidgetRoom | null {
  return (config.rooms ?? []).find((r) => r.id === roomId) ?? null;
}

export function getRoomGuestLimits(
  config: WidgetGetResponse,
  categoryId: BookingCategoryId,
  roomId: string
): RoomGuestLimits {
  if (categoryId === "homes") {
    const room = config.dailyRooms?.find((r) => r.id === roomId);
    const maxGuests = room?.maxCapacity ?? room?.capacity ?? 10;
    const included =
      typeof room?.capacity === "number" && Number.isFinite(room.capacity)
        ? room.capacity
        : maxGuests;
    const pp = room?.pricePeriod;
    const fallback = Math.max(
      Number(pp?.extraGuestWeekDay) || 0,
      Number(pp?.extraGuestWeekEnd) || 0,
      Number(pp?.extraGuestPreWeekEnd) || 0
    );
    return {
      maxGuests,
      includedCapacity: Math.max(0, included),
      extraType: 0,
      extraValueFallback: fallback,
    };
  }

  const room = getBanyaRoom(config, roomId);
  const pp = room?.pricePeriod;
  const maxGuests = room?.maxCapacity ?? room?.capacity ?? 10;
  const included =
    typeof pp?.includedCapacity === "number" && Number.isFinite(pp.includedCapacity)
      ? pp.includedCapacity
      : room?.capacity ?? maxGuests;

  return {
    maxGuests,
    includedCapacity: Math.max(0, included),
    extraType: typeof pp?.extraType === "number" ? pp.extraType : 0,
    extraValueFallback:
      typeof pp?.extraValue === "number" && Number.isFinite(pp.extraValue)
        ? pp.extraValue
        : 0,
  };
}

/** Ночи [checkIn, checkOut). */
export function listStayNightDates(
  checkIn: string,
  checkOut: string
): string[] {
  if (!checkIn || !checkOut || checkOut <= checkIn) return [];
  const dates: string[] = [];
  let cur = parseISO(checkIn);
  const end = parseISO(checkOut);
  while (cur < end) {
    dates.push(format(cur, "yyyy-MM-dd"));
    cur = addDays(cur, 1);
  }
  return dates;
}

/**
 * Тариф доп. гостя за ночь (дома).
 * Пт — preWeekEnd, Сб/Вс — weekEnd, иначе weekDay.
 */
export function extraGuestRateForNightDate(
  dateStr: string,
  pp: WidgetDailyRoomPricePeriod | null | undefined
): number {
  if (!pp) return 0;
  const day = getDay(parseISO(dateStr));
  if (day === 5) {
    return (
      Number(pp.extraGuestPreWeekEnd) ||
      Number(pp.extraGuestWeekEnd) ||
      Number(pp.extraGuestWeekDay) ||
      0
    );
  }
  if (day === 0 || day === 6) {
    return Number(pp.extraGuestWeekEnd) || Number(pp.extraGuestWeekDay) || 0;
  }
  return Number(pp.extraGuestWeekDay) || 0;
}

export type ResolveExtraGuestArgs = {
  config: WidgetGetResponse;
  categoryId: BookingCategoryId;
  roomId: string;
  guestCount: number;
  calcMeta?: Pick<SetupCalcMeta, "extraValueForDate"> | null;
  slotDuration?: number | null;
  banyaTimeFrom?: string | null;
  banyaTimeTo?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  /** Даты ночей из /daily-calculate (если есть). */
  nightDates?: string[] | null;
};

export function resolveExtraGuestSurcharge(
  args: ResolveExtraGuestArgs
): ExtraGuestResolveResult {
  const empty: ExtraGuestResolveResult = {
    extraGuests: 0,
    unitPrice: 0,
    surcharge: 0,
    nights: 0,
    ratesEqual: true,
    includedInRoomTotal: args.categoryId === "homes",
  };

  if (args.categoryId === "homes") {
    const room = args.config.dailyRooms?.find((r) => r.id === args.roomId);
    if (!room) return empty;
    const limits = getRoomGuestLimits(args.config, "homes", args.roomId);
    const extraGuests = Math.max(
      0,
      Math.floor(args.guestCount) - limits.includedCapacity
    );
    if (extraGuests <= 0) {
      return { ...empty, extraGuests: 0 };
    }

    const nightDates =
      args.nightDates && args.nightDates.length > 0
        ? args.nightDates
        : args.checkIn && args.checkOut
          ? listStayNightDates(args.checkIn, args.checkOut)
          : [];
    if (nightDates.length === 0) return empty;

    const rates = nightDates.map((d) =>
      extraGuestRateForNightDate(d, room.pricePeriod)
    );
    const surcharge = rates.reduce((s, rate) => s + extraGuests * rate, 0);
    const unitPrice = rates[0] ?? 0;
    const ratesEqual = rates.every((r) => r === unitPrice);

    return {
      extraGuests,
      unitPrice,
      surcharge: Number.isFinite(surcharge) ? surcharge : 0,
      nights: nightDates.length,
      ratesEqual,
      includedInRoomTotal: true,
    };
  }

  // Бани: extraValueForDate из /calculate, иначе pricePeriod.extraValue
  const limits = getRoomGuestLimits(args.config, "banya", args.roomId);
  const fromApi = args.calcMeta?.extraValueForDate;
  const extraValuePerGuest =
    fromApi != null && fromApi > 0 ? fromApi : limits.extraValueFallback;

  const durationHours =
    args.slotDuration != null && args.slotDuration > 0
      ? args.slotDuration
      : args.banyaTimeFrom && args.banyaTimeTo
        ? computeDurationHours(args.banyaTimeFrom, args.banyaTimeTo)
        : 1;

  const base = computeExtraGuestSurcharge({
    guestCount: args.guestCount,
    includedCapacity: limits.includedCapacity,
    extraValuePerGuest,
    extraType: limits.extraType,
    durationHours,
  });

  return {
    ...base,
    nights: 0,
    ratesEqual: true,
    includedInRoomTotal: false,
  };
}

/** Цена ночи без доплаты доп. гостей (для строк разбивки). */
export function nightPriceWithoutExtraGuests(
  nightPrice: number,
  date: string,
  extraGuests: number,
  pp: WidgetDailyRoomPricePeriod | null | undefined
): number {
  if (extraGuests <= 0) return nightPrice;
  const rate = extraGuestRateForNightDate(date, pp);
  return Math.max(0, nightPrice - extraGuests * rate);
}
