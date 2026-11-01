import { useMemo } from "react";
import type { WidgetApiClient, WidgetGetResponse } from "../../../api";
import type { BookingCalcMeta } from "../checkout/checkoutDraft";
import { buildCheckoutProducts } from "../checkout/buildSavePayload";
import type { BookingCategoryId } from "../types";
import { computeDurationHours, type SetupCalcMeta } from "./calculate.utils";
import {
  getRoomGuestLimits,
  nightPriceWithoutExtraGuests,
  resolveExtraGuestSurcharge,
} from "./roomGuestPricing";
import { useSetupCalculate } from "./useSetupCalculate";

export type BookingQuoteArgs = {
  api: WidgetApiClient;
  categoryId: BookingCategoryId;
  config: WidgetGetResponse;
  roomId: string;
  checkIn: string | null;
  checkOut: string | null;
  banyaDate: string | null;
  banyaTimeFrom: string | null;
  banyaTimeTo: string | null;
  slotDuration: number | null;
  slotPrice: number | null;
  guestCount: number;
  productQuantities: Record<string, number>;
  basePrice: number | null;
  calcMeta: BookingCalcMeta | null;
  onBasePriceResolved: (price: number, meta?: SetupCalcMeta) => void;
};

/**
 * Расчёт стоимости брони (setup + checkout):
 * /calculate, доп. товары, доплата за доп. гостей, итог.
 */
export function useBookingQuote({
  api,
  categoryId,
  config,
  roomId,
  checkIn,
  checkOut,
  banyaDate,
  banyaTimeFrom,
  banyaTimeTo,
  slotDuration,
  slotPrice,
  guestCount,
  productQuantities,
  basePrice,
  calcMeta,
  onBasePriceResolved,
}: BookingQuoteArgs) {
  const calcInput = useMemo(
    () => ({
      categoryId,
      roomId,
      guestCount,
      checkIn,
      checkOut,
      banyaDate,
      banyaTimeFrom,
      banyaTimeTo,
      slotDuration,
      slotPrice,
    }),
    [
      categoryId,
      roomId,
      guestCount,
      checkIn,
      checkOut,
      banyaDate,
      banyaTimeFrom,
      banyaTimeTo,
      slotDuration,
      slotPrice,
    ]
  );

  const { isLoading, error, banyaCalc, homesCalc, hasCalculation, retry } =
    useSetupCalculate({
      api,
      input: calcInput,
      onPriceResolved: onBasePriceResolved,
    });

  const dailyRoom =
    categoryId === "homes"
      ? config.dailyRooms?.find((r) => r.id === roomId)
      : undefined;
  const roomName =
    categoryId === "homes"
      ? dailyRoom?.name ?? "Дом"
      : config.rooms?.find((r) => r.id === roomId)?.name ?? "Баня";
  const checkInTime = dailyRoom?.checkInTime ?? null;
  const checkOutTime = dailyRoom?.checkOutTime ?? null;

  const products = useMemo(
    () => buildCheckoutProducts(config, productQuantities),
    [config, productQuantities]
  );
  const productLines = products.map((p) => ({
    id: p.id,
    name: p.name,
    qty: p.count,
    unitPrice: p.price,
    lineTotal: p.price * p.count,
  }));
  const productsSubtotal = productLines.reduce((s, l) => s + l.lineTotal, 0);

  const effectiveMeta: BookingCalcMeta | null = calcMeta
    ? calcMeta
    : banyaCalc
      ? {
          prepay: banyaCalc.prepay,
          prepayIncludesProducts: banyaCalc.prepayIncludesProducts,
          extraValueForDate: banyaCalc.extraValueForDate,
          discountAmount: banyaCalc.discountAmount,
          discountText: null,
          amountBeforeDiscount: banyaCalc.amountBeforeDiscount,
        }
      : homesCalc
        ? {
            prepay: homesCalc.prepay,
            prepayIncludesProducts: homesCalc.prepayIncludesProducts,
            extraValueForDate: null,
            discountAmount: homesCalc.discountAmount,
            discountText: homesCalc.discountText,
            amountBeforeDiscount: homesCalc.originalPrice,
          }
        : null;

  const resolvedBase =
    basePrice != null && basePrice > 0
      ? basePrice
      : banyaCalc?.total ??
        homesCalc?.total ??
        (slotPrice != null && slotPrice > 0 ? slotPrice : 0);

  const extraGuest = useMemo(() => {
    const result = resolveExtraGuestSurcharge({
      config,
      categoryId,
      roomId,
      guestCount,
      calcMeta: effectiveMeta,
      slotDuration,
      banyaTimeFrom,
      banyaTimeTo,
      checkIn,
      checkOut,
      nightDates: homesCalc?.nightPrices.map((n) => n.date) ?? null,
    });
    if (result.surcharge <= 0) return null;
    const limits = getRoomGuestLimits(config, categoryId, roomId);
    const durationHours =
      slotDuration != null && slotDuration > 0
        ? slotDuration
        : banyaTimeFrom && banyaTimeTo
          ? computeDurationHours(banyaTimeFrom, banyaTimeTo)
          : 1;
    return {
      extraGuests: result.extraGuests,
      unitPrice: result.unitPrice,
      surcharge: result.surcharge,
      perHour: limits.extraType === 1,
      durationHours,
      nights: result.nights > 0 ? result.nights : undefined,
      ratesEqual: result.ratesEqual,
      includedInRoomTotal: result.includedInRoomTotal,
    };
  }, [
    config,
    categoryId,
    roomId,
    guestCount,
    effectiveMeta,
    slotDuration,
    banyaTimeFrom,
    banyaTimeTo,
    checkIn,
    checkOut,
    homesCalc,
  ]);

  const extraSurcharge = extraGuest?.surcharge ?? 0;
  const total =
    resolvedBase +
    productsSubtotal +
    (extraGuest?.includedInRoomTotal ? 0 : extraSurcharge);
  const displayRoomBase =
    extraGuest?.includedInRoomTotal && extraSurcharge > 0
      ? Math.max(0, resolvedBase - extraSurcharge)
      : resolvedBase;

  const summaryHomesCalc =
    homesCalc && extraGuest && extraGuest.extraGuests > 0
      ? {
          ...homesCalc,
          nightPrices: homesCalc.nightPrices.map((n) => {
            const room = config.dailyRooms?.find((r) => r.id === roomId);
            return {
              date: n.date,
              price: nightPriceWithoutExtraGuests(
                n.price,
                n.date,
                extraGuest.extraGuests,
                room?.pricePeriod
              ),
            };
          }),
        }
      : homesCalc;

  return {
    isLoading,
    error,
    hasCalculation,
    retry,
    roomName,
    checkInTime,
    checkOutTime,
    products,
    productLines,
    productsSubtotal,
    effectiveMeta,
    resolvedBase,
    extraGuest,
    total,
    displayRoomBase,
    summaryHomesCalc,
  };
}

export type BookingQuote = ReturnType<typeof useBookingQuote>;
