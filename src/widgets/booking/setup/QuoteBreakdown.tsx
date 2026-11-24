import React from "react";
import { CheckoutSummary } from "../checkout/CheckoutSummary";
import type { PaymentMode } from "../checkout/checkoutDraft";
import type { BookingCategoryId } from "../types";
import type { BookingQuote } from "./useBookingQuote";

type Props = {
  quote: BookingQuote;
  categoryId: BookingCategoryId;
  guestCount: number;
  banyaDate: string | null;
  banyaTimeFrom: string | null;
  banyaTimeTo: string | null;
  checkIn: string | null;
  checkOut: string | null;
  certificateBalance?: number | null;
  paymentMode?: PaymentMode | null;
  promoPercent?: number | null;
};

/** «Подробный расчёт» с состояниями загрузки и ошибки (setup + checkout). */
export const QuoteBreakdown: React.FC<Props> = ({
  quote,
  categoryId,
  guestCount,
  banyaDate,
  banyaTimeFrom,
  banyaTimeTo,
  checkIn,
  checkOut,
  certificateBalance = null,
  paymentMode = null,
  promoPercent = null,
}) => {
  const { isLoading, error, hasCalculation, retry, effectiveMeta } = quote;

  const summary = (
    <CheckoutSummary
      categoryId={categoryId}
      roomName={quote.roomName}
      guestCount={guestCount}
      basePrice={quote.displayRoomBase}
      productLines={quote.productLines}
      total={quote.total}
      banyaDate={banyaDate}
      banyaTimeFrom={banyaTimeFrom}
      banyaTimeTo={banyaTimeTo}
      checkIn={checkIn}
      checkOut={checkOut}
      checkInTime={quote.checkInTime}
      checkOutTime={quote.checkOutTime}
      nightLines={quote.summaryHomesCalc?.nightPrices ?? []}
      periodMessage={quote.summaryHomesCalc?.periodMessage ?? null}
      prepaymentAmount={effectiveMeta?.prepay ?? null}
      prepayIncludesProducts={effectiveMeta?.prepayIncludesProducts ?? null}
      discountAmount={effectiveMeta?.discountAmount ?? null}
      discountText={effectiveMeta?.discountText ?? null}
      amountBeforeDiscount={effectiveMeta?.amountBeforeDiscount ?? null}
      extraGuest={quote.extraGuest}
      certificateBalance={certificateBalance}
      paymentMode={paymentMode}
      promoPercent={promoPercent}
    />
  );

  if (guestCount < 1) {
    return (
      <div className="booking-setup-calc booking-setup-calc--placeholder">
        Укажите количество гостей для расчёта стоимости
      </div>
    );
  }

  if (isLoading && hasCalculation) {
    return (
      <div
        className="booking-setup-calc booking-setup-calc--refresh"
        aria-busy="true"
      >
        <div className="booking-setup-calc__frozen">{summary}</div>
        <div className="booking-setup-calc__veil" role="status">
          <div className="booking-setup-calc__veil-card">
            <div className="booking-setup-calc__spinner" aria-hidden />
            <p className="booking-setup-calc__state-title">Считаем стоимость</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || (!hasCalculation && !error)) {
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
        <button
          type="button"
          className="booking-setup-calc__retry"
          onClick={retry}
        >
          Повторить
        </button>
      </div>
    );
  }

  return summary;
};
