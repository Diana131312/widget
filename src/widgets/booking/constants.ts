/** Жёсткий tenant для booking MVP. */
export const BOOKING_ALIAS = "les" as const;

/**
 * Эксперимент: весь виджет на Roboto (класс `.bk-widget--font-roboto`).
 * false — вернуть Georgia для текста (как было).
 */
export const BOOKING_UNIFIED_ROBOTO_FONT = true;

export const BOOKING_SESSION_STORAGE_KEY = `booking-widget:${BOOKING_ALIAS}:v1`;
