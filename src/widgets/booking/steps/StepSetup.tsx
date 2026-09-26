import React, { useEffect, useMemo } from "react";
import type { WidgetGetResponse, WidgetProduct } from "../../../api";
import { createWidgetApi } from "../../../api";
import { BOOKING_ALIAS } from "../constants";
import type { BookingCategoryId } from "../types";
import { getMaxExtraGuests } from "../setup/extraGuestLimit";
import { groupProductsForRoom } from "../setup/groupProducts";
import { ProductCatalog } from "../setup/ProductCatalog";
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
  onBasePriceResolved: (price: number) => void;
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
    if (categoryId === "homes") {
      const room = config.dailyRooms?.find((r) => r.id === roomId);
      return {
        name: room?.name ?? "Дом",
        maxGuests: room?.maxCapacity ?? room?.capacity ?? 10,
      };
    }
    const room = config.rooms?.find((r) => r.id === roomId);
    return {
      name: room?.name ?? "Баня",
      maxGuests: room?.maxCapacity ?? room?.capacity ?? 10,
    };
  }, [categoryId, config, roomId]);

  const { maxGuests, name: roomName } = roomMeta;
  // TODO(prod): лимит из админки/товара — см. EXTRA_GUEST_HARD_LIMIT
  const maxExtraGuests = getMaxExtraGuests(guestCount);

  const catalog = useMemo(
    () => groupProductsForRoom(config, categoryId, roomId),
    [config, categoryId, roomId]
  );

  const extra = catalog.extraGuestProduct;
  const extraQty = extra ? productQuantities[extra.id] ?? 0 : 0;

  // Сжимаем qty доп. гостей, если уменьшили число гостей.
  useEffect(() => {
    if (!extra) return;
    if (extraQty > maxExtraGuests) {
      onSetProductQty(extra.id, maxExtraGuests);
    }
  }, [extra, extraQty, maxExtraGuests, onSetProductQty]);

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
  const total = (basePrice ?? 0) + productsSubtotal;

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
        />

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

          {extra ? (
            <div className="booking-setup__extra-guest">
              <p className="booking-setup__extra-guest-name">{extra.name}</p>
              <div className="booking-qty">
                <button
                  type="button"
                  className="booking-qty__btn"
                  onClick={() => onSetProductQty(extra.id, extraQty - 1)}
                  disabled={extraQty <= 0}
                  aria-label={`Убрать ${extra.name}`}
                >
                  −
                </button>
                <span className="booking-qty__value" aria-live="polite">
                  {extraQty}/{maxExtraGuests}
                </span>
                <button
                  type="button"
                  className="booking-qty__btn"
                  onClick={() =>
                    onSetProductQty(
                      extra.id,
                      Math.min(maxExtraGuests, extraQty + 1)
                    )
                  }
                  disabled={extraQty >= maxExtraGuests}
                  aria-label={`Добавить ${extra.name}`}
                >
                  +
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <SetupPriceBreakdown
          categoryId={categoryId}
          roomName={roomName}
          banyaDate={banyaDate}
          banyaTimeFrom={banyaTimeFrom}
          banyaTimeTo={banyaTimeTo}
          checkIn={checkIn}
          checkOut={checkOut}
          guestCount={guestCount}
          basePrice={basePrice}
          banyaCalc={banyaCalc}
          homesCalc={homesCalc}
          productLines={productLines}
          productsSubtotal={productsSubtotal}
          total={total}
          isLoading={isLoading}
          error={error}
          onRetry={retry}
        />
      </div>

      <div className="booking-setup__footer">
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
