import React from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import type { CartBookingItem } from "../../cart";
import { getCategoryLabel } from "../../cart/cartTypes";
import { formatDailyRangeLabel } from "../../daily/DailyRangeCalendar";

type Props = {
  item: CartBookingItem;
  productNames?: Map<string, string>;
};

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMMM yyyy", { locale: ru });
  } catch {
    return dateStr;
  }
}

export const CartItemSummary: React.FC<Props> = ({ item, productNames }) => {
  const isHomes = item.categoryId === "homes";
  const productLines = Object.entries(item.productQuantities ?? {}).filter(
    ([, qty]) => qty > 0
  );

  return (
    <div className="cart-item-summary text-sm leading-relaxed text-[#485548]">
      <p className="cart-item-summary__heading">
        {getCategoryLabel(item.categoryId)} · {item.roomName}
      </p>
      {isHomes && item.checkInDate && item.checkOutDate ? (
        <p>{formatDailyRangeLabel(item.checkInDate, item.checkOutDate)}</p>
      ) : item.date ? (
        <p>Дата {formatDate(item.date)}</p>
      ) : null}
      {item.timeFrom && item.timeTo && (
        <p>
          Время {item.timeFrom} — {item.timeTo}
          {item.slotLabel ? ` (${item.slotLabel})` : ""}
        </p>
      )}
      <p>Гостей {item.guestCount}</p>
      <p>
        {isHomes ? "Проживание" : "Стоимость"} {item.basePrice.toLocaleString("ru-RU")} ₽
      </p>
      {productLines.length > 0 && (
        <ul className="cart-item-summary__products">
          {productLines.map(([id, qty]) => (
            <li key={id}>
              {productNames?.get(id) ?? "Товар"} ×{qty}
            </li>
          ))}
        </ul>
      )}
      <p>Доп. товары {item.productsSubtotal.toLocaleString("ru-RU")} ₽</p>
      <p className="cart-item-summary__total font-semibold">
        Итого {item.total.toLocaleString("ru-RU")} ₽
      </p>
    </div>
  );
};
