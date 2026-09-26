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
  const [guestCount, setGuestCountState] = useState(0);
  const [productQuantities, setProductQuantities] = useState<
    Record<string, number>
  >({});
  const [basePrice, setBasePrice] = useState<number | null>(null);
  const [slotDuration, setSlotDuration] = useState<number | null>(null);
  const [slotPrice, setSlotPrice] = useState<number | null>(null);

  const skipPersistRef = useRef(false);

  const clearSetupExtras = useCallback(() => {
    setGuestCountState(0);
    setProductQuantities({});
    setBasePrice(null);
  }, []);

  const clearSlotMeta = useCallback(() => {
    setSlotDuration(null);
    setSlotPrice(null);
  }, []);

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

  const hydrate = useCallback(
    (
      next: BookingUrlState,
      slotMeta?: { duration: number | null; price: number | null } | null
    ) => {
      skipPersistRef.current = true;
      setStepId(next.stepId);
      setCategoryId(next.categoryId);
      setRoomId(next.roomId);
      setCheckIn(next.checkIn);
      setCheckOut(next.checkOut);
      setBanyaDate(next.banyaDate);
      setBanyaTimeFrom(next.banyaTimeFrom);
      setBanyaTimeTo(next.banyaTimeTo);
      clearSetupExtras();
      if (slotMeta) {
        setSlotDuration(slotMeta.duration);
        setSlotPrice(slotMeta.price);
      } else {
        clearSlotMeta();
      }
    },
    [clearSetupExtras, clearSlotMeta]
  );

  const title =
    stepId === "category"
      ? ROOT_TITLE
      : stepId === "setup"
        ? "Параметры"
        : stepId === "checkout" || stepId === "extras"
          ? "Оформление"
          : (categoryId && getCategoryConfig(categoryId)?.title) || ROOT_TITLE;

  const canGoBack = stepId !== "category";

  const selectCategory = useCallback(
    (id: BookingCategoryId) => {
      setCategoryId(id);
      setRoomId(null);
      setCheckIn(null);
      setCheckOut(null);
      setBanyaDate(null);
      setBanyaTimeFrom(null);
      setBanyaTimeTo(null);
      clearSetupExtras();
      clearSlotMeta();
      setStepId("object");
    },
    [clearSetupExtras, clearSlotMeta]
  );

  const selectHome = useCallback(
    (payload: { roomId: string; checkIn: string; checkOut: string }) => {
      setRoomId(payload.roomId);
      setCheckIn(payload.checkIn);
      setCheckOut(payload.checkOut);
      setBanyaDate(null);
      setBanyaTimeFrom(null);
      setBanyaTimeTo(null);
      clearSetupExtras();
      clearSlotMeta();
      setStepId("setup");
    },
    [clearSetupExtras, clearSlotMeta]
  );

  const selectBanya = useCallback(
    (payload: {
      roomId: string;
      date: string;
      timeFrom: string;
      timeTo: string;
      duration?: number;
      price?: number;
    }) => {
      setRoomId(payload.roomId);
      setBanyaDate(payload.date);
      setBanyaTimeFrom(payload.timeFrom);
      setBanyaTimeTo(payload.timeTo);
      setCheckIn(null);
      setCheckOut(null);
      clearSetupExtras();
      setSlotDuration(
        payload.duration != null && payload.duration > 0
          ? payload.duration
          : null
      );
      setSlotPrice(
        payload.price != null && payload.price > 0 ? payload.price : null
      );
      setStepId("setup");
    },
    [clearSetupExtras]
  );

  const clearObjectSelection = useCallback(() => {
    setRoomId(null);
    setCheckIn(null);
    setCheckOut(null);
    setBanyaDate(null);
    setBanyaTimeFrom(null);
    setBanyaTimeTo(null);
    clearSetupExtras();
    clearSlotMeta();
  }, [clearSetupExtras, clearSlotMeta]);

  const setGuestCount = useCallback((next: number) => {
    setGuestCountState(Math.max(0, next));
    setBasePrice(null);
  }, []);

  const setProductQty = useCallback((productId: string, next: number) => {
    setProductQuantities((prev) => {
      const nextMap = { ...prev };
      if (next <= 0) delete nextMap[productId];
      else nextMap[productId] = next;
      return nextMap;
    });
  }, []);

  const setBasePriceResolved = useCallback((price: number) => {
    setBasePrice(price);
  }, []);

  const continueFromSetup = useCallback(() => {
    // extras (мультикорзина) временно пропускаем
    setStepId("checkout");
  }, []);

  const startOver = useCallback(() => {
    setStepId("category");
    setCategoryId(null);
    clearObjectSelection();
  }, [clearObjectSelection]);

  const back = useCallback(() => {
    if (stepId === "checkout" || stepId === "extras") {
      setStepId("setup");
      return;
    }
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
      if (target === "setup") {
        setStepId("setup");
        return;
      }
      if (target === "extras") {
        // временно недоступен
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
    slotDuration,
    slotPrice,
    guestCount,
    productQuantities,
    basePrice,
    title,
    canGoBack,
    selectCategory,
    selectHome,
    selectBanya,
    setGuestCount,
    setProductQty,
    setBasePriceResolved,
    continueFromSetup,
    startOver,
    back,
    goToStep,
    hydrate,
    snapshot,
  };
}

export { DEFAULT_BOOKING_URL_STATE };
