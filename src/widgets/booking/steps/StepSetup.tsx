import React, { useMemo } from "react";
import type { WidgetGetResponse, WidgetProduct } from "../../../api";
import { createWidgetApi } from "../../../api";
import { BOOKING_ALIAS } from "../constants";
import type { BookingCategoryId } from "../types";
import { computeDurationHours } from "../setup/calculate.utils";
import { groupProductsForRoom } from "../setup/groupProducts";
import { ProductCatalog } from "../setup/ProductCatalog";
import {
  getRoomGuestLimits,
  nightPriceWithoutExtraGuests,
  resolveExtraGuestSurcharge,
} from "../setup/roomGuestPricing";
import { SetupPriceBreakdown } from "../setup/SetupPriceBreakdown";
import { useSetupCalculate } from "../setup/useSetupCalculate";

type Props = {
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
  onGuestCountChange: (next: number) => void;
  onSetProductQty: (productId: string, next: number) => void;
  onBasePriceResolved: (
    price: number,
    meta?: import("../setup/calculate.utils").SetupCalcMeta
  ) => void;
  onContinue: () => void;
};

export const StepSetup: React.FC<Props> = ({
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
  onGuestCountChange,
  onSetProductQty,
  onBasePriceResolved,
  onContinue,
}) => {
  const api = useMemo(() => createWidgetApi({ alias: BOOKING_ALIAS }), []);
  const tenantId = config.settings?.tenantId ?? null;

  const roomMeta = useMemo(() => {
    const limits = getRoomGuestLimits(config, categoryId, roomId);
    if (categoryId === "homes") {
      const room = config.dailyRooms?.find((r) => r.id === roomId);
      return { name: room?.name ?? "Дом", ...limits };
    }
    const room = config.rooms?.find((r) => r.id === roomId);
    return { name: room?.name ?? "Баня", ...limits };
  }, [categoryId, config, roomId]);

  const { maxGuests, name: roomName } = roomMeta;

  const catalog = useMemo(
    () => groupProductsForRoom(config, categoryId, roomId),
    [config, categoryId, roomId]
  );

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

  const extraGuest = useMemo(() => {
    const result = resolveExtraGuestSurcharge({
      config,
      categoryId,
      roomId,
      guestCount,
      calcMeta: banyaCalc
        ? { extraValueForDate: banyaCalc.extraValueForDate }
        : null,
      slotDuration,
      banyaTimeFrom,
      banyaTimeTo,
      checkIn,
      checkOut,
      nightDates: homesCalc?.nightPrices.map((n) => n.date) ?? null,
    });
    if (result.surcharge <= 0) return null;
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
      perHour: roomMeta.extraType === 1,
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
    banyaCalc,
    homesCalc,
    slotDuration,
    banyaTimeFrom,
    banyaTimeTo,
    checkIn,
    checkOut,
    roomMeta.extraType,
  ]);

  const productLines = useMemo(() => {
    const lines: {
      product: WidgetProduct;
      qty: number;
      lineTotal: number;
    }[] = [];
    for (const [id, qty] of Object.entries(productQuantities)) {
      if (qty <= 0) continue;
      const product = catalog.productsById.get(id);
      if (!product) continue;
      lines.push({ product, qty, lineTotal: product.price * qty });
    }
    return lines.sort((a, b) =>
      a.product.name.localeCompare(b.product.name, "ru")
    );
  }, [productQuantities, catalog.productsById]);

  const productsSubtotal = productLines.reduce((s, l) => s + l.lineTotal, 0);
  const extraSurcharge = extraGuest?.surcharge ?? 0;
  // Дома: /daily-calculate уже включает доплату в totalPrice — не удваиваем.
  // Бани: /calculate без доплаты — прибавляем на клиенте.
  const total =
    (basePrice ?? 0) +
    productsSubtotal +
    (extraGuest?.includedInRoomTotal ? 0 : extraSurcharge);
  const displayRoomBase =
    extraGuest?.includedInRoomTotal && extraSurcharge > 0
      ? Math.max(0, (basePrice ?? 0) - extraSurcharge)
      : (basePrice ?? 0);

  // Пока идёт debounce/пересчёт — оставляем прежний блок, не прячем его спиннером
  const showCalcLoading = isLoading && !hasCalculation;

  const canProceed =
    guestCount >= 1 &&
    hasCalculation &&
    basePrice != null &&
    basePrice > 0 &&
    !isLoading &&
    !error;

  return (
    <div className="booking-setup">
      <div className="booking-setup__main">
        <h3 className="booking-setup__section-title">Дополнительные товары</h3>
        <ProductCatalog
          groups={catalog.groups}
          quantities={productQuantities}
          onSetQuantity={onSetProductQty}
          tenantId={tenantId}
          layout="accordion"
        />

        <SetupPriceBreakdown
          categoryId={categoryId}
          roomName={roomName}
          banyaDate={banyaDate}
          banyaTimeFrom={banyaTimeFrom}
          banyaTimeTo={banyaTimeTo}
          checkIn={checkIn}
          checkOut={checkOut}
          guestCount={guestCount}
          basePrice={displayRoomBase}
          banyaCalc={banyaCalc}
          homesCalc={
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
              : homesCalc
          }
          productLines={productLines}
          productsSubtotal={productsSubtotal}
          total={total}
          extraGuest={extraGuest}
          isLoading={showCalcLoading}
          error={error}
          onRetry={retry}
        />
      </div>

      <div className="booking-setup__cta">
        <div className="booking-setup__guests">
          <div className="booking-setup__guests-main">
            <p className="booking-setup__guests-label">Количество гостей</p>
            <div className="booking-qty">
              <button
                type="button"
                className="booking-qty__btn"
                onClick={() => onGuestCountChange(guestCount - 1)}
                disabled={guestCount <= 0}
                aria-label="Уменьшить количество гостей"
              >
                −
              </button>
              <span
                className={[
                  "booking-qty__value",
                  guestCount === 0 ? "booking-qty__value--warn" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-live="polite"
              >
                {guestCount}/{maxGuests}
              </span>
              <button
                type="button"
                className="booking-qty__btn"
                onClick={() => onGuestCountChange(guestCount + 1)}
                disabled={guestCount >= maxGuests}
                aria-label="Увеличить количество гостей"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="booking-setup__continue"
          disabled={!canProceed}
          onClick={onContinue}
        >
          Далее →
        </button>
      </div>
    </div>
  );
};
