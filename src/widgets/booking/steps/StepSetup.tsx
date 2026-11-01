import React, { useMemo, useState } from "react";
import { createWidgetApi, type WidgetGetResponse } from "../../../api";
import type { BookingCalcMeta } from "../checkout/checkoutDraft";
import { BOOKING_ALIAS } from "../constants";
import type { BookingCategoryId } from "../types";
import type { SetupCalcMeta } from "../setup/calculate.utils";
import { ExtraGuestInfoModal } from "../setup/ExtraGuestInfoModal";
import { groupProductsForRoom } from "../setup/groupProducts";
import { ProductCatalog } from "../setup/ProductCatalog";
import { QuoteBreakdown } from "../setup/QuoteBreakdown";
import { splitGuestCount } from "../setup/extraGuestLimit";
import { getRoomGuestLimits } from "../setup/roomGuestPricing";
import { useBookingQuote } from "../setup/useBookingQuote";
import { formatDateDots, formatStayDateTime } from "../ui/formatStay";

type Props = {
  categoryId: BookingCategoryId;
  config: WidgetGetResponse;
  roomId: string;
  checkIn?: string | null;
  checkOut?: string | null;
  banyaDate?: string | null;
  banyaTimeFrom?: string | null;
  banyaTimeTo?: string | null;
  slotDuration?: number | null;
  slotPrice?: number | null;
  basePrice?: number | null;
  calcMeta?: BookingCalcMeta | null;
  guestCount: number;
  productQuantities: Record<string, number>;
  onGuestCountChange: (next: number) => void;
  onSetProductQty: (productId: string, next: number) => void;
  onBasePriceResolved?: (price: number, meta?: SetupCalcMeta) => void;
  onContinue: () => void;
};

const noopPriceResolved = () => {};

/** Шаг 3: выбранный слот, гости, доп. товары, подробный расчёт. */
export const StepSetup: React.FC<Props> = ({
  categoryId,
  config,
  roomId,
  checkIn = null,
  checkOut = null,
  banyaDate = null,
  banyaTimeFrom = null,
  banyaTimeTo = null,
  slotDuration = null,
  slotPrice = null,
  basePrice = null,
  calcMeta = null,
  guestCount,
  productQuantities,
  onGuestCountChange,
  onSetProductQty,
  onBasePriceResolved = noopPriceResolved,
  onContinue,
}) => {
  const api = useMemo(() => createWidgetApi({ alias: BOOKING_ALIAS }), []);
  const tenantId = config.settings?.tenantId ?? null;
  const [guestInfoOpen, setGuestInfoOpen] = useState(false);

  const roomMeta = useMemo(
    () => getRoomGuestLimits(config, categoryId, roomId),
    [categoryId, config, roomId]
  );

  const { maxGuests, includedCapacity } = roomMeta;

  const guestSplit = useMemo(
    () => splitGuestCount(guestCount, includedCapacity, maxGuests),
    [guestCount, includedCapacity, maxGuests]
  );

  const setBaseGuests = (next: number) => {
    const clamped = Math.max(0, Math.min(guestSplit.maxBaseGuests, next));
    if (clamped < guestSplit.maxBaseGuests) {
      onGuestCountChange(clamped);
      return;
    }
    onGuestCountChange(clamped + guestSplit.extraGuests);
  };

  const setExtraGuests = (next: number) => {
    if (!guestSplit.extraUnlocked) return;
    const clamped = Math.max(0, Math.min(guestSplit.maxExtraGuests, next));
    onGuestCountChange(guestSplit.maxBaseGuests + clamped);
  };

  const catalog = useMemo(
    () => groupProductsForRoom(config, categoryId, roomId),
    [config, categoryId, roomId]
  );

  const quote = useBookingQuote({
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
  });

  const dailyRoom =
    categoryId === "homes"
      ? config.dailyRooms?.find((r) => r.id === roomId)
      : undefined;

  const guestsMissing = guestCount < 1;
  const canProceed = !guestsMissing;

  return (
    <div className="booking-setup">
      <div className="booking-setup__main">
        <div className="booking-setup__slot" aria-label="Выбранное время">
          <p className="booking-setup__slot-name">{quote.roomName}</p>
          {categoryId === "banya" ? (
            <p className="booking-setup__slot-line">
              {banyaDate ? formatDateDots(banyaDate) : "—"}
              {banyaTimeFrom && banyaTimeTo
                ? `, ${banyaTimeFrom}–${banyaTimeTo}`
                : ""}
            </p>
          ) : (
            <>
              <p className="booking-setup__slot-line">
                <span className="booking-setup__slot-label">Заезд</span>{" "}
                {checkIn
                  ? formatStayDateTime(checkIn, dailyRoom?.checkInTime)
                  : "—"}
              </p>
              <p className="booking-setup__slot-line">
                <span className="booking-setup__slot-label">Выезд</span>{" "}
                {checkOut
                  ? formatStayDateTime(checkOut, dailyRoom?.checkOutTime)
                  : "—"}
              </p>
            </>
          )}
        </div>

        <div className="booking-setup__guests-block">
          <div className="booking-setup__guests">
            <div
              className={[
                "booking-setup__guests-main",
                guestsMissing ? "booking-setup__guests-main--error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <p className="booking-setup__guests-label">
                Укажите количество человек
              </p>
              <div className="booking-qty">
                <button
                  type="button"
                  className="booking-qty__btn"
                  onClick={() => setBaseGuests(guestSplit.baseGuests - 1)}
                  disabled={guestSplit.baseGuests <= 0}
                  aria-label="Уменьшить количество гостей"
                >
                  −
                </button>
                <span
                  className="booking-qty__value"
                  aria-live="polite"
                  aria-invalid={guestsMissing || undefined}
                >
                  {guestSplit.baseGuests}/{guestSplit.maxBaseGuests}
                </span>
                <button
                  type="button"
                  className="booking-qty__btn"
                  onClick={() => setBaseGuests(guestSplit.baseGuests + 1)}
                  disabled={guestSplit.baseGuests >= guestSplit.maxBaseGuests}
                  aria-label="Увеличить количество гостей"
                >
                  +
                </button>
              </div>
            </div>

            {guestSplit.maxExtraGuests > 0 ? (
              <div
                className={[
                  "booking-setup__extra-guest",
                  guestSplit.extraUnlocked
                    ? ""
                    : "booking-setup__extra-guest--disabled",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-disabled={!guestSplit.extraUnlocked}
              >
                <p className="booking-setup__extra-guest-name">Доп. гости</p>
                <div className="booking-qty">
                  <button
                    type="button"
                    className="booking-qty__btn"
                    onClick={() => setExtraGuests(guestSplit.extraGuests - 1)}
                    disabled={
                      !guestSplit.extraUnlocked || guestSplit.extraGuests <= 0
                    }
                    aria-label="Уменьшить количество дополнительных гостей"
                  >
                    −
                  </button>
                  <span className="booking-qty__value" aria-live="polite">
                    {guestSplit.extraGuests}/{guestSplit.maxExtraGuests}
                  </span>
                  <button
                    type="button"
                    className="booking-qty__btn"
                    onClick={() => setExtraGuests(guestSplit.extraGuests + 1)}
                    disabled={
                      !guestSplit.extraUnlocked ||
                      guestSplit.extraGuests >= guestSplit.maxExtraGuests
                    }
                    aria-label="Увеличить количество дополнительных гостей"
                  >
                    +
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {guestSplit.extraGuests > 0 ? (
            <p className="booking-checkout__channel-note booking-setup__extra-hint">
              Доп. гости без дополнительной комплектации.{" "}
              <button
                type="button"
                className="booking-setup__extra-hint-more"
                onClick={() => setGuestInfoOpen(true)}
              >
                Подробнее
              </button>
            </p>
          ) : null}
        </div>

        <h3 className="booking-setup__section-title">Дополнительные товары</h3>
        <ProductCatalog
          groups={catalog.groups}
          quantities={productQuantities}
          onSetQuantity={onSetProductQty}
          tenantId={tenantId}
          layout="accordion"
        />

        {!guestsMissing ? (
          <QuoteBreakdown
            quote={quote}
            categoryId={categoryId}
            guestCount={guestCount}
            banyaDate={banyaDate}
            banyaTimeFrom={banyaTimeFrom}
            banyaTimeTo={banyaTimeTo}
            checkIn={checkIn}
            checkOut={checkOut}
          />
        ) : null}
      </div>

      <div className="booking-setup__cta">
        <button
          type="button"
          className="booking-setup__continue"
          disabled={!canProceed}
          onClick={onContinue}
        >
          Далее →
        </button>
      </div>

      <ExtraGuestInfoModal
        open={guestInfoOpen}
        onClose={() => setGuestInfoOpen(false)}
      />
    </div>
  );
};
