import React from "react";
import { BedDouble, Home } from "lucide-react";
import { Button } from "../../../components/ui/button";
import type { StepProps } from "./stepTypes";
import { useBookingCart } from "../cart";
import { getCategoryLabel } from "../cart/cartTypes";
import { formatDailyRangeLabel } from "../daily/DailyRangeCalendar";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMMM yyyy", { locale: ru });
  } catch {
    return dateStr;
  }
}

export const StepAddServices: React.FC<StepProps> = ({ goTo, state }) => {
  const cart = useBookingCart();
  const config = state.data.config;
  const hasBanya = Boolean(config?.rooms?.length);
  const hasHomes = Boolean(config?.dailyRooms?.length);

  const handleAddBanya = () => {
    const stepId = cart.startNewBooking("banyaTest");
    goTo(stepId);
  };

  const handleAddHome = () => {
    const stepId = cart.startNewBooking("homes");
    goTo(stepId);
  };

  return (
    <div className="step-add-services">
      <p className="stepper-widget__sub">
        Бронирования сохранены в корзине. Можно добавить ещё баню или дом.
      </p>

      {cart.items.length > 0 && (
        <ul className="multi-cart-preview">
          {cart.items.map((item) => (
            <li key={item.id} className="multi-cart-preview__item">
              <span className="multi-cart-preview__type">{getCategoryLabel(item.categoryId)}</span>
              <span className="multi-cart-preview__name">{item.roomName}</span>
              <span className="multi-cart-preview__meta">
                {item.categoryId === "homes" && item.checkInDate && item.checkOutDate
                  ? formatDailyRangeLabel(item.checkInDate, item.checkOutDate)
                  : item.date
                    ? formatDate(item.date)
                    : null}
                {item.timeFrom && item.timeTo ? ` · ${item.timeFrom}—${item.timeTo}` : null}
                {` · ${item.guestCount} гост.`}
              </span>
              <span className="multi-cart-preview__price">
                {item.total.toLocaleString("ru-RU")} ₽
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="step-add-services__actions">
        {hasBanya && (
          <button
            type="button"
            className="step-add-services__card"
            onClick={handleAddBanya}
          >
            <BedDouble size={22} aria-hidden />
            <span>Добавить баню</span>
          </button>
        )}
        {hasHomes && (
          <button
            type="button"
            className="step-add-services__card"
            onClick={handleAddHome}
          >
            <Home size={22} aria-hidden />
            <span>Добавить дом</span>
          </button>
        )}
      </div>

      {cart.items.length > 0 && (
        <div className="step-add-services__footer">
          <p className="step-add-services__total">
            В корзине {cart.cartCount}{" "}
            {cart.cartCount === 1
              ? "бронирование"
              : cart.cartCount < 5
                ? "бронирования"
                : "бронирований"}
            · {cart.cartTotal.toLocaleString("ru-RU")} ₽
          </p>
          <Button
            type="button"
            className="h-11 w-full rounded-xl bg-[#485548] text-sm font-medium text-white hover:bg-[#485548]/90"
            onClick={() => goTo("bookingStepFive")}
          >
            Перейти к оформлению
          </Button>
        </div>
      )}
    </div>
  );
};
