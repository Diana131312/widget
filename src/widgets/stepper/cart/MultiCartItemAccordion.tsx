import React from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../components/ui/accordion";
import { CartItemSummary } from "../steps/booking-step-three/CartItemSummary";
import type { CartBookingItem } from "./cartTypes";
import { getCategoryLabel } from "./cartTypes";
import { formatDailyRangeLabel } from "../daily/DailyRangeCalendar";

type Props = {
  items: CartBookingItem[];
  productNames?: Map<string, string>;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
};

function formatDateShort(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMM", { locale: ru });
  } catch {
    return dateStr;
  }
}

function getCollapsedMeta(item: CartBookingItem): string {
  if (item.categoryId === "homes" && item.checkInDate && item.checkOutDate) {
    return formatDailyRangeLabel(item.checkInDate, item.checkOutDate);
  }
  if (item.date) {
    const datePart = formatDateShort(item.date);
    if (item.timeFrom && item.timeTo) {
      return `${datePart} · ${item.timeFrom}—${item.timeTo}`;
    }
    return datePart;
  }
  return "";
}

export const MultiCartItemAccordion: React.FC<Props> = ({
  items,
  productNames,
  onEdit,
  onRemove,
}) => {
  if (items.length === 0) return null;

  return (
    <Accordion type="multiple" className="multi-cart-accordion">
      {items.map((item) => {
        const meta = getCollapsedMeta(item);
        return (
          <AccordionItem key={item.id} value={item.id} className="multi-cart-accordion__item">
            <AccordionTrigger className="multi-cart-accordion__trigger hover:no-underline">
              <span className="multi-cart-accordion__trigger-main">
                <span className="multi-cart-accordion__type">{getCategoryLabel(item.categoryId)}</span>
                <span className="multi-cart-accordion__name">{item.roomName}</span>
                {meta ? <span className="multi-cart-accordion__meta">{meta}</span> : null}
              </span>
              <span className="multi-cart-accordion__price">
                {item.total.toLocaleString("ru-RU")} ₽
              </span>
            </AccordionTrigger>
            <AccordionContent className="multi-cart-accordion__content">
              <CartItemSummary item={item} productNames={productNames} />
              <div className="multi-cart-accordion__actions">
                <button
                  type="button"
                  className="multi-cart-accordion__action-btn"
                  onClick={() => onEdit(item.id)}
                >
                  <Pencil size={16} aria-hidden />
                  Изменить
                </button>
                <button
                  type="button"
                  className="multi-cart-accordion__action-btn multi-cart-accordion__action-btn--danger"
                  onClick={() => onRemove(item.id)}
                >
                  <Trash2 size={16} aria-hidden />
                  Удалить
                </button>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};
