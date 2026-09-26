import { useCallback, useEffect, useRef, useState } from "react";
import { getCategoryConfig } from "./categories";
import {
  getStepIndex,
  type BookingCategoryId,
  type BookingStepId,
} from "./types";
import type { BookingUrlState } from "./url/bookingUrl";
import { DEFAULT_BOOKING_URL_STATE } from "./url/bookingUrl";

const ROOT_TITLE = "Бронирование";

type UseBookingFlowArgs = {
  initial: BookingUrlState;
  onPersist?: (state: BookingUrlState) => void;
};

export function useBookingFlow({ initial, onPersist }: UseBookingFlowArgs) {
  const [stepId, setStepId] = useState<BookingStepId>(initial.stepId);
  const [categoryId, setCategoryId] = useState<BookingCategoryId | null>(
    initial.categoryId
  );
  const [roomId, setRoomId] = useState<string | null>(initial.roomId ?? null);
  const [checkIn, setCheckIn] = useState<string | null>(initial.checkIn ?? null);
  const [checkOut, setCheckOut] = useState<string | null>(
    initial.checkOut ?? null
  );
  const [banyaDate, setBanyaDate] = useState<string | null>(
    initial.banyaDate ?? null
  );
  const [banyaTimeFrom, setBanyaTimeFrom] = useState<string | null>(
    initial.banyaTimeFrom ?? null
  );
  const [banyaTimeTo, setBanyaTimeTo] = useState<string | null>(
    initial.banyaTimeTo ?? null
  );

  const skipPersistRef = useRef(false);

  const snapshot = useCallback(
    (): BookingUrlState => ({
      stepId,
      categoryId,
      roomId,
      checkIn,
      checkOut,
      banyaDate,
      banyaTimeFrom,
      banyaTimeTo,
    }),
    [
      stepId,
      categoryId,
      roomId,
      checkIn,
      checkOut,
      banyaDate,
      banyaTimeFrom,
      banyaTimeTo,
    ]
  );

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    onPersist?.(snapshot());
  }, [snapshot, onPersist]);

  const hydrate = useCallback((next: BookingUrlState) => {
    skipPersistRef.current = true;
    setStepId(next.stepId);
    setCategoryId(next.categoryId);
    setRoomId(next.roomId);
    setCheckIn(next.checkIn);
    setCheckOut(next.checkOut);
    setBanyaDate(next.banyaDate);
    setBanyaTimeFrom(next.banyaTimeFrom);
    setBanyaTimeTo(next.banyaTimeTo);
  }, []);

  const title =
    stepId === "category"
      ? ROOT_TITLE
      : stepId === "setup"
        ? "Параметры"
        : (categoryId && getCategoryConfig(categoryId)?.title) || ROOT_TITLE;

  const canGoBack = stepId !== "category";

  const selectCategory = useCallback((id: BookingCategoryId) => {
    setCategoryId(id);
    setRoomId(null);
    setCheckIn(null);
    setCheckOut(null);
    setBanyaDate(null);
    setBanyaTimeFrom(null);
    setBanyaTimeTo(null);
    setStepId("object");
  }, []);

  const selectHome = useCallback(
    (payload: { roomId: string; checkIn: string; checkOut: string }) => {
      setRoomId(payload.roomId);
      setCheckIn(payload.checkIn);
      setCheckOut(payload.checkOut);
      setBanyaDate(null);
      setBanyaTimeFrom(null);
      setBanyaTimeTo(null);
      setStepId("setup");
    },
    []
  );

  const selectBanya = useCallback(
    (payload: {
      roomId: string;
      date: string;
      timeFrom: string;
      timeTo: string;
    }) => {
      setRoomId(payload.roomId);
      setBanyaDate(payload.date);
      setBanyaTimeFrom(payload.timeFrom);
      setBanyaTimeTo(payload.timeTo);
      setCheckIn(null);
      setCheckOut(null);
      setStepId("setup");
    },
    []
  );

  const clearObjectSelection = useCallback(() => {
    setRoomId(null);
    setCheckIn(null);
    setCheckOut(null);
    setBanyaDate(null);
    setBanyaTimeFrom(null);
    setBanyaTimeTo(null);
  }, []);

  const back = useCallback(() => {
    if (stepId === "setup") {
      setStepId("object");
      clearObjectSelection();
      return;
    }
    if (stepId === "object") {
      setStepId("category");
      setCategoryId(null);
      clearObjectSelection();
    }
  }, [stepId, clearObjectSelection]);

  /** Только на прошлые шаги (индекс строго меньше текущего). */
  const goToStep = useCallback(
    (target: BookingStepId) => {
      if (getStepIndex(target) >= getStepIndex(stepId)) return;

      if (target === "category") {
        setStepId("category");
        setCategoryId(null);
        clearObjectSelection();
        return;
      }
      if (target === "object") {
        setStepId("object");
        clearObjectSelection();
        return;
      }
      setStepId(target);
    },
    [stepId, clearObjectSelection]
  );

  return {
    stepId,
    categoryId,
    roomId,
    checkIn,
    checkOut,
    banyaDate,
    banyaTimeFrom,
    banyaTimeTo,
    title,
    canGoBack,
    selectCategory,
    selectHome,
    selectBanya,
    back,
    goToStep,
    hydrate,
    snapshot,
  };
}

export { DEFAULT_BOOKING_URL_STATE };
