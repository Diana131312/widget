import { BOOKING_ALIAS } from "../constants";
import type { BookingUrlState } from "../url/bookingUrl";
import type { BookingResultDraft, CheckoutContactDraft } from "./checkoutDraft";

/**
 * Неоплаченная бронь текущей вкладки (sessionStorage).
 * Нужна, чтобы после F5 / «назад» в браузере вернуть экран оплаты,
 * а не ошибку «слот занят» — его держит наша же бронь.
 */
export const PENDING_BOOKING_STORAGE_KEY = `booking-widget:${BOOKING_ALIAS}:pending:v1`;

type SlotKey = Pick<
  BookingUrlState,
  | "categoryId"
  | "roomId"
  | "banyaDate"
  | "banyaTimeFrom"
  | "banyaTimeTo"
  | "checkIn"
  | "checkOut"
>;

export type PendingBooking = {
  /** Состояние корзины на момент брони (для восстановления шага) */
  state: BookingUrlState;
  contact: CheckoutContactDraft;
  result: BookingResultDraft;
};

function defaultStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/** Момент автоотмены (мс). Нет таймаута → null. */
export function withPaymentDeadline(
  result: BookingResultDraft,
  now: number = Date.now()
): BookingResultDraft {
  if (result.expiresAtMs != null) return result;
  const minutes = result.timeoutMinutes;
  return minutes != null && minutes > 0
    ? { ...result, expiresAtMs: now + minutes * 60 * 1000 }
    : result;
}

export function savePendingBooking(
  value: PendingBooking,
  storage: Storage | null = defaultStorage()
): void {
  // бронь без ссылки на оплату — уже окончательная, восстанавливать нечего
  if (!value.result.paymentLink || value.result.expiresAtMs == null) return;
  try {
    storage?.setItem(PENDING_BOOKING_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function clearPendingBooking(
  storage: Storage | null = defaultStorage()
): void {
  try {
    storage?.removeItem(PENDING_BOOKING_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Действующая неоплаченная бронь; истёкшая удаляется. */
export function readPendingBooking(
  storage: Storage | null = defaultStorage(),
  now: number = Date.now()
): PendingBooking | null {
  try {
    const raw = storage?.getItem(PENDING_BOOKING_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as PendingBooking | null;
    const deadline = o?.result?.expiresAtMs;
    if (!o?.state || !o.contact || !o.result?.bookingId || deadline == null) {
      clearPendingBooking(storage);
      return null;
    }
    if (deadline <= now) {
      clearPendingBooking(storage);
      return null;
    }
    return o;
  } catch {
    clearPendingBooking(storage);
    return null;
  }
}

/** Тот же объект и то же время/даты, что в неоплаченной брони. */
export function isSameSlot(a: SlotKey, b: SlotKey): boolean {
  if (a.categoryId !== b.categoryId || a.roomId !== b.roomId) return false;
  if (a.categoryId === "homes") {
    return a.checkIn === b.checkIn && a.checkOut === b.checkOut;
  }
  return (
    a.banyaDate === b.banyaDate &&
    a.banyaTimeFrom === b.banyaTimeFrom &&
    a.banyaTimeTo === b.banyaTimeTo
  );
}
