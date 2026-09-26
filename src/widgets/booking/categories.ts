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
};

export const BOOKING_CATEGORIES: BookingCategoryConfig[] = [
  {
    id: "homes",
    caption: "Коттеджи",
    title: "Дома",
    Icon: Home,
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
