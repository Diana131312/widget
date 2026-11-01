import type { LucideIcon } from "lucide-react";
import { Flame, Home } from "lucide-react";
import type { BookingCategoryId } from "./types";

export type BookingCategoryConfig = {
  id: BookingCategoryId;
  /** Подпись на карточке выбора */
  caption: string;
  /** Заголовок шапки после выбора */
  title: string;
  Icon: LucideIcon;
  /** Временно скрыта из выбора и deep-link */
  hidden?: boolean;
};

export const BOOKING_CATEGORIES: BookingCategoryConfig[] = [
  {
    id: "homes",
    caption: "Коттеджи",
    title: "Дома",
    Icon: Home,
    // TODO: вернуть, когда бронирование домов снова откроется
    hidden: true,
  },
  {
    id: "banya",
    caption: "Бани на дровах",
    title: "Бани",
    Icon: Flame,
  },
];

export function getCategoryConfig(
  id: BookingCategoryId
): BookingCategoryConfig | undefined {
  return BOOKING_CATEGORIES.find((c) => c.id === id);
}

export const VISIBLE_BOOKING_CATEGORIES = BOOKING_CATEGORIES.filter(
  (c) => !c.hidden
);

export function isCategoryHidden(id: BookingCategoryId): boolean {
  return Boolean(getCategoryConfig(id)?.hidden);
}
