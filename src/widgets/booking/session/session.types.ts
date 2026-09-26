import type { BookingCategoryId, BookingStepId } from "../types";

/**
 * Версионируемый снимок прогресса.
 * Новые поля только добавляем; при смене version — миграция в storage.
 */
export type BookingSessionV1 = {
  version: 1;
  updatedAt: number;
  stepId: BookingStepId;
  categoryId: BookingCategoryId | null;
  roomId?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  banyaDate?: string | null;
};

export type BookingSessionPatch = Partial<
  Omit<BookingSessionV1, "version" | "updatedAt">
>;

export const DEFAULT_BOOKING_SESSION: Omit<
  BookingSessionV1,
  "updatedAt"
> = {
  version: 1,
  stepId: "category",
  categoryId: null,
  roomId: null,
  checkIn: null,
  checkOut: null,
  banyaDate: null,
};
