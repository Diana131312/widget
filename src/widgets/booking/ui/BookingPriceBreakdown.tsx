import React from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
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
  /** Доплата за каждого гостя сверх вместимости */
  extraValueForDate?: number | null;
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
  extraValueForDate = null,
  className,
}) => {
  const rootClass = ["booking-price-breakdown", className]
    .filter(Boolean)
    .join(" ");

  const showExtra =
    categoryId === "banya" &&
    extraValueForDate != null &&
    extraValueForDate > 0;
  const showPrepay =
    prepaymentAmount != null && prepaymentAmount > 0;

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
            {basePrice.toLocaleString("ru-RU")} ₽
          </span>
        </li>
        {showExtra ? (
          <li className="booking-price-breakdown__row">
            <span>Доплата за гостя сверх вместимости</span>
            <span className="booking-price-breakdown__num">
              {extraValueForDate!.toLocaleString("ru-RU")} ₽
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
          <span>
            Предоплата
            {prepayIncludesProducts === true
              ? " (с товарами)"
              : prepayIncludesProducts === false
                ? " (без товаров)"
                : ""}
          </span>
          <span className="booking-price-breakdown__num">
            {prepaymentAmount!.toLocaleString("ru-RU")} ₽
          </span>
        </div>
      ) : null}
    </div>
  );
};
