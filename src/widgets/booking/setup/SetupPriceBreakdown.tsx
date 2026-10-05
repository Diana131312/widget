import React from "react";
import type { WidgetProduct } from "../../../api";
import type { BookingCategoryId } from "../types";
import { BookingPriceBreakdown } from "../ui/BookingPriceBreakdown";
import type {
  BanyaCalculateView,
  HomesCalculateView,
} from "./calculate.utils";

export type PriceLineItem = {
  product: WidgetProduct;
  qty: number;
  lineTotal: number;
};

type Props = {
  categoryId: BookingCategoryId;
  roomName: string;
  banyaDate: string | null;
  banyaTimeFrom: string | null;
  banyaTimeTo: string | null;
  checkIn: string | null;
  checkOut: string | null;
  guestCount: number;
  basePrice: number | null;
  banyaCalc: BanyaCalculateView | null;
  homesCalc: HomesCalculateView | null;
  productLines: PriceLineItem[];
  productsSubtotal: number;
  total: number;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
};

export const SetupPriceBreakdown: React.FC<Props> = ({
  categoryId,
  roomName,
  banyaDate,
  banyaTimeFrom,
  banyaTimeTo,
  checkIn,
  checkOut,
  guestCount,
  basePrice,
  banyaCalc,
  homesCalc,
  productLines,
  total,
  isLoading,
  error,
  onRetry,
}) => {
  if (guestCount < 1) {
    return (
      <div className="booking-setup-calc booking-setup-calc--placeholder">
        Укажите количество гостей для расчёта стоимости
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="booking-setup-calc booking-setup-calc--loading"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="booking-setup-calc__spinner" aria-hidden />
        <div className="booking-setup-calc__state-copy">
          <p className="booking-setup-calc__state-title">Считаем стоимость</p>
          <p className="booking-setup-calc__state-detail">
            Это займёт пару секунд
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="booking-setup-calc booking-setup-calc--error" role="alert">
        <div className="booking-setup-calc__state-copy">
          <p className="booking-setup-calc__state-title">
            Не удалось рассчитать стоимость
          </p>
          <p className="booking-setup-calc__state-detail">{error}</p>
        </div>
        {onRetry ? (
          <button
            type="button"
            className="booking-setup-calc__retry"
            onClick={onRetry}
          >
            Повторить
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <BookingPriceBreakdown
      className="booking-setup-calc"
      categoryId={categoryId}
      roomName={roomName}
      guestCount={guestCount}
      basePrice={basePrice ?? 0}
      productLines={productLines.map(({ product, qty, lineTotal }) => ({
        id: product.id,
        name: product.name,
        qty,
        unitPrice: product.price,
        lineTotal,
      }))}
      total={total}
      banyaDate={banyaDate}
      banyaTimeFrom={banyaTimeFrom}
      banyaTimeTo={banyaTimeTo}
      checkIn={checkIn}
      checkOut={checkOut}
      nightLines={homesCalc?.nightPrices ?? []}
      periodMessage={homesCalc?.periodMessage ?? null}
      prepaymentAmount={banyaCalc?.prepay ?? null}
      prepayIncludesProducts={banyaCalc?.prepayIncludesProducts ?? null}
      extraValueForDate={banyaCalc?.extraValueForDate ?? null}
    />
  );
};
