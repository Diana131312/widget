import React, { useMemo } from "react";
import type { WidgetGetResponse } from "../../../api";
import type { BookingCategoryId } from "../types";
import { groupProductsForRoom } from "../setup/groupProducts";
import { ProductCatalog } from "../setup/ProductCatalog";
import { splitGuestCount } from "../setup/extraGuestLimit";
import { getRoomGuestLimits } from "../setup/roomGuestPricing";

type Props = {
  categoryId: BookingCategoryId;
  config: WidgetGetResponse;
  roomId: string;
  guestCount: number;
  productQuantities: Record<string, number>;
  onGuestCountChange: (next: number) => void;
  onSetProductQty: (productId: string, next: number) => void;
  onContinue: () => void;
};

export const StepSetup: React.FC<Props> = ({
  categoryId,
  config,
  roomId,
  guestCount,
  productQuantities,
  onGuestCountChange,
  onSetProductQty,
  onContinue,
}) => {
  const tenantId = config.settings?.tenantId ?? null;

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

  const canProceed = guestCount >= 1;

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

        <div className="booking-setup__guests">
          <div className="booking-setup__guests-main">
            <p className="booking-setup__guests-label">Количество гостей</p>
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
              <span className="booking-qty__value" aria-live="polite">
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
    </div>
  );
};
