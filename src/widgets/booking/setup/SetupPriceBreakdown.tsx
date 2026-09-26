import React from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import type { WidgetProduct } from "../../../api";
import type { BookingCategoryId } from "../types";
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
  productsSubtotal,
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

  const baseLabel = categoryId === "homes" ? "Проживание" : "Стоимость бани";

  return (
    <div className="booking-setup-calc">
      <p className="booking-setup-calc__heading">Подробный расчёт</p>

      <ul className="booking-setup-calc__meta">
        <li className="booking-setup-calc__row">
          <span>{categoryId === "homes" ? "Дом" : "Баня"}</span>
          <span className="booking-setup-calc__num">{roomName}</span>
        </li>
        {categoryId === "banya" && banyaDate ? (
          <li className="booking-setup-calc__row">
            <span>Дата</span>
            <span className="booking-setup-calc__num">
              {formatDate(banyaDate)}
            </span>
          </li>
        ) : null}
        {categoryId === "banya" && banyaTimeFrom && banyaTimeTo ? (
          <li className="booking-setup-calc__row">
            <span>Время</span>
            <span className="booking-setup-calc__num">
              {banyaTimeFrom}–{banyaTimeTo}
            </span>
          </li>
        ) : null}
        {categoryId === "homes" && checkIn && checkOut ? (
          <li className="booking-setup-calc__row">
            <span>Даты</span>
            <span className="booking-setup-calc__num">
              {formatDate(checkIn)} → {formatDate(checkOut)}
            </span>
          </li>
        ) : null}
        <li className="booking-setup-calc__row">
          <span>Гостей</span>
          <span className="booking-setup-calc__num">{guestCount}</span>
        </li>
      </ul>

      {categoryId === "homes" && homesCalc && homesCalc.nightPrices.length > 0 && (
        <ul className="booking-setup-calc__lines">
          {homesCalc.nightPrices.map((night) => (
            <li key={night.date} className="booking-setup-calc__row">
              <span>Ночь {formatNightDate(night.date)}</span>
              <span className="booking-setup-calc__num">
                {night.price.toLocaleString("ru-RU")} ₽
              </span>
            </li>
          ))}
          {homesCalc.periodMessage ? (
            <li className="booking-setup-calc__note">{homesCalc.periodMessage}</li>
          ) : null}
        </ul>
      )}

      {categoryId === "banya" && banyaCalc && banyaCalc.lines.length > 0 && (
        <ul className="booking-setup-calc__lines">
          {banyaCalc.lines.map((line, i) => (
            <li key={i} className="booking-setup-calc__row">
              <span>{line.label}</span>
              <span className="booking-setup-calc__num">
                {line.amount.toLocaleString("ru-RU")} ₽
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="booking-setup-calc__summary">
        <div className="booking-setup-calc__row">
          <span>{baseLabel}</span>
          <span className="booking-setup-calc__num">
            {(basePrice ?? 0).toLocaleString("ru-RU")} ₽
          </span>
        </div>
        <div className="booking-setup-calc__row">
          <span>Доп. товары</span>
          <span className="booking-setup-calc__num">
            {productsSubtotal.toLocaleString("ru-RU")} ₽
          </span>
        </div>
        {productLines.length > 0 && (
          <ul className="booking-setup-calc__products">
            {productLines.map(({ product, qty, lineTotal }) => (
              <li key={product.id} className="booking-setup-calc__row">
                <span className="booking-setup-calc__product-name">
                  {product.name} ×{qty}
                </span>
                <span className="booking-setup-calc__num">
                  {lineTotal.toLocaleString("ru-RU")} ₽
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="booking-setup-calc__row booking-setup-calc__row--total">
          <span>Итого</span>
          <span className="booking-setup-calc__num">
            {total.toLocaleString("ru-RU")} ₽
          </span>
        </div>
      </div>
    </div>
  );
};
