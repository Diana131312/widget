import React from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import type { BookingDraft } from "../../types";

type Props = {
  draft: BookingDraft;
  productsSubtotal: number;
  total: number;
};

function formatBookingHeading(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    return format(d, "d MMMM yyyy", { locale: ru });
  } catch {
    return dateStr;
  }
}

/** Текстовая калькуляция без «карточек» — в стиле виджета. */
export const CheckoutPlainSummary: React.FC<Props> = ({ draft, productsSubtotal, total }) => {
  const base = draft.basePrice;
  const dateHeading = formatBookingHeading(draft.date);

  return (
    <div className="space-y-2 text-sm leading-relaxed text-[#485548]">
      <p>Бронирование на {dateHeading}</p>
      <p>Баня {draft.roomName}</p>
      <p>
        Время {draft.timeFrom} — {draft.timeTo}
      </p>
      <p>Гостей {draft.guestCount}</p>
      <p>Стоимость Бани {base.toLocaleString("ru-RU")} ₽</p>
      <p>Доп. товары {productsSubtotal.toLocaleString("ru-RU")} ₽</p>
      <div className="my-3 border-t border-gray-200" aria-hidden />
      <p className="text-base font-semibold text-[#485548]">
        Итого к оплате {total.toLocaleString("ru-RU")} ₽
      </p>
    </div>
  );
};
