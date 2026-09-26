import { useCallback, useMemo, useRef } from "react";
import {
  clearBookingSession,
  readBookingSession,
  writeBookingSession,
} from "./session.storage";
import type { BookingSessionPatch, BookingSessionV1 } from "./session.types";

const PERSIST_DEBOUNCE_MS = 150;

/**
 * Зеркалирует прогресс бронирования в sessionStorage.
 * Расширяйте BookingSessionV1 новыми полями и передавайте их через persist().
 */
export function useBookingSession() {
  const initialRef = useRef<BookingSessionV1 | null>(null);
  if (initialRef.current === null) {
    initialRef.current = readBookingSession();
  }

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback((patch: BookingSessionPatch) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      writeBookingSession(patch);
      timerRef.current = null;
    }, PERSIST_DEBOUNCE_MS);
  }, []);

  const persistNow = useCallback((patch: BookingSessionPatch) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    writeBookingSession(patch);
  }, []);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    clearBookingSession();
  }, []);

  return useMemo(
    () => ({
      initial: initialRef.current!,
      persist,
      persistNow,
      clear,
    }),
    [persist, persistNow, clear]
  );
}
