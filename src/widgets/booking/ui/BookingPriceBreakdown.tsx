import React from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { resolveClientPrepay } from "../setup/resolveClientPrepay";
import type { BookingCategoryId } from "../types";

export type BreakdownProductLine = {
  id: string;
  name: string;
  qty: number;
  /** Цена за единицу */
  unitPrice: number;
  lineTotal: number;
};

export type BreakdownNightLine = {
  date: string;
  price: number;
};

export type ExtraGuestBreakdown = {
  extraGuests: number;
  unitPrice: number;
  surcharge: number;
  /** extraType === 1 — умножали на часы (бани) */
  perHour: boolean;
  durationHours: number;
  /** Дома: число ночей в доплате */
  nights?: number;
  /** Дома: тариф одинаковый все ночи — можно показать формулу × ночи */
  ratesEqual?: boolean;
};

type Props = {
  categoryId: BookingCategoryId;
  roomName: string;
  guestCount: number;
  basePrice: number;
  productLines: BreakdownProductLine[];
  total: number;
  banyaDate: string | null;
  banyaTimeFrom: string | null;
  banyaTimeTo: string | null;
  checkIn: string | null;
  checkOut: string | null;
  /** Опционально: разбивка ночей для домов */
  nightLines?: BreakdownNightLine[];
  periodMessage?: string | null;
  heading?: string;
  /** Предоплата из /calculate (prepay) или после /save */
  prepaymentAmount?: number | null;
  prepayIncludesProducts?: boolean | null;
  /** Сумма скидки (amount − total или originalPrice − total) */
  discountAmount?: number | null;
  discountText?: string | null;
  amountBeforeDiscount?: number | null;
  /** Доплата за доп. гостей (клиентский расчёт) */
  extraGuest?: ExtraGuestBreakdown | null;
  className?: string;
};

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMMM yyyy", { locale: ru });
  } catch {
    return dateStr;
  }
}

function formatNightDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMM", { locale: ru });
  } catch {
    return dateStr;
  }
}

/**
 * Единый блок «Подробный расчёт» для setup и checkout.
 */
export const BookingPriceBreakdown: React.FC<Props> = ({
  categoryId,
  roomName,
  guestCount,
  basePrice,
  productLines,
  total,
  banyaDate,
  banyaTimeFrom,
  banyaTimeTo,
  checkIn,
  checkOut,
  nightLines = [],
  periodMessage = null,
  heading = "Подробный расчёт",
  prepaymentAmount = null,
  prepayIncludesProducts = null,
  discountAmount = null,
  discountText = null,
  amountBeforeDiscount = null,
  extraGuest = null,
  className,
}) => {
  const rootClass = ["booking-price-breakdown", className]
    .filter(Boolean)
    .join(" ");

  const productsSubtotal = productLines.reduce((s, l) => s + l.lineTotal, 0);
  const displayPrepay = resolveClientPrepay(
    prepaymentAmount,
    productsSubtotal,
    prepayIncludesProducts
  );

  const showExtra =
    extraGuest != null &&
    extraGuest.extraGuests > 0 &&
    extraGuest.surcharge > 0;
  const showDiscount =
    (discountAmount != null && discountAmount > 0) || Boolean(discountText);
  const showPrepay = displayPrepay != null && displayPrepay > 0;

  const costLabel =
    amountBeforeDiscount != null &&
    amountBeforeDiscount > 0 &&
    discountAmount != null &&
    discountAmount > 0
      ? amountBeforeDiscount
      : basePrice;

  return (
    <div className={rootClass}>
      <p className="booking-price-breakdown__heading">{heading}</p>

      <ul className="booking-price-breakdown__meta">
        <li className="booking-price-breakdown__row">
          <span>{categoryId === "homes" ? "Дом" : "Баня"}</span>
          <span className="booking-price-breakdown__num">{roomName}</span>
        </li>
        {categoryId === "banya" && banyaDate ? (
          <li className="booking-price-breakdown__row">
            <span>Дата</span>
            <span className="booking-price-breakdown__num">
              {formatDate(banyaDate)}
            </span>
          </li>
        ) : null}
        {categoryId === "banya" && banyaTimeFrom && banyaTimeTo ? (
          <li className="booking-price-breakdown__row">
            <span>Время</span>
            <span className="booking-price-breakdown__num">
              {banyaTimeFrom}–{banyaTimeTo}
            </span>
          </li>
        ) : null}
        {categoryId === "homes" && checkIn && checkOut ? (
          <li className="booking-price-breakdown__row">
            <span>Даты</span>
            <span className="booking-price-breakdown__num">
              {formatDate(checkIn)} → {formatDate(checkOut)}
            </span>
          </li>
        ) : null}
        <li className="booking-price-breakdown__row">
          <span>Гостей</span>
          <span className="booking-price-breakdown__num">{guestCount}</span>
        </li>
        {nightLines.map((night) => (
          <li key={night.date} className="booking-price-breakdown__row">
            <span>Ночь {formatNightDate(night.date)}</span>
            <span className="booking-price-breakdown__num">
              {night.price.toLocaleString("ru-RU")} ₽
            </span>
          </li>
        ))}
        {periodMessage ? (
          <li className="booking-price-breakdown__note">{periodMessage}</li>
        ) : null}
        <li className="booking-price-breakdown__row">
          <span>Стоимость</span>
          <span className="booking-price-breakdown__num">
            {costLabel.toLocaleString("ru-RU")} ₽
          </span>
        </li>
        {showDiscount ? (
          <li className="booking-price-breakdown__row">
            <span>
              Скидка
              {discountText ? ` (${discountText})` : ""}
            </span>
            <span className="booking-price-breakdown__num">
              {discountAmount != null && discountAmount > 0
                ? `−${discountAmount.toLocaleString("ru-RU")} ₽`
                : "—"}
            </span>
          </li>
        ) : null}
        {showExtra ? (
          <li className="booking-price-breakdown__row">
            <span>
              Доп. гости
              {extraGuest!.nights != null &&
              extraGuest!.nights > 0 &&
              extraGuest!.ratesEqual !== false
                ? ` (${extraGuest!.extraGuests} × ${extraGuest!.unitPrice.toLocaleString("ru-RU")} ₽ × ${extraGuest!.nights} ноч.)`
                : extraGuest!.perHour
                  ? ` (${extraGuest!.extraGuests} × ${extraGuest!.unitPrice.toLocaleString("ru-RU")} ₽ × ${extraGuest!.durationHours} ч)`
                  : ` (${extraGuest!.extraGuests} × ${extraGuest!.unitPrice.toLocaleString("ru-RU")} ₽)`}
            </span>
            <span className="booking-price-breakdown__num">
              {extraGuest!.surcharge.toLocaleString("ru-RU")} ₽
            </span>
          </li>
        ) : null}
      </ul>

      <div className="booking-price-breakdown__products">
        <p className="booking-price-breakdown__section">Доп. товары</p>
        {productLines.length === 0 ? (
          <p className="booking-price-breakdown__empty">Нет</p>
        ) : (
          <ul className="booking-price-breakdown__product-list">
            {productLines.map((line) => (
              <li key={line.id} className="booking-price-breakdown__row">
                <span className="booking-price-breakdown__product-name">
                  {line.name}
                </span>
                <span className="booking-price-breakdown__num booking-price-breakdown__num--formula">
                  {line.qty} × {line.unitPrice.toLocaleString("ru-RU")} ₽ ={" "}
                  {line.lineTotal.toLocaleString("ru-RU")} ₽
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="booking-price-breakdown__row booking-price-breakdown__row--total">
        <span>Итого</span>
        <span className="booking-price-breakdown__num">
          {total.toLocaleString("ru-RU")} ₽
        </span>
      </div>
      {showPrepay ? (
        <div className="booking-price-breakdown__row booking-price-breakdown__row--prepay">
          <span>Предоплата</span>
          <span className="booking-price-breakdown__num">
            {displayPrepay!.toLocaleString("ru-RU")} ₽
          </span>
        </div>
      ) : null}
    </div>
  );
};
