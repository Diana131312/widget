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
  const [guestCount, setGuestCountState] = useState(
    () => initial.guestCount ?? 0
  );
  const [productQuantities, setProductQuantities] = useState<
    Record<string, number>
  >(() => ({ ...(initial.productQuantities ?? {}) }));
  const [basePrice, setBasePrice] = useState<number | null>(null);
  const [slotDuration, setSlotDuration] = useState<number | null>(null);
  const [slotPrice, setSlotPrice] = useState<number | null>(null);
  const [contactDraft, setContactDraft] =
    useState<import("./checkout/checkoutDraft").CheckoutContactDraft | null>(
      null
    );
  const [bookingResult, setBookingResult] =
    useState<import("./checkout/checkoutDraft").BookingResultDraft | null>(
      null
    );
  const [calcMeta, setCalcMeta] =
    useState<import("./checkout/checkoutDraft").BookingCalcMeta | null>(null);
  /**
   * true — зашли по ссылке с room id: при «Назад» с setup оставляем фокус на объекте.
   * false — шли из списка всех: при «Назад» убираем room из URL/стейта.
   */
  const [roomFocusPinned, setRoomFocusPinned] = useState(() =>
    Boolean(initial.roomId)
  );

  const skipPersistRef = useRef(false);

  const clearSetupExtras = useCallback(() => {
    setGuestCountState(0);
    setProductQuantities({});
    setBasePrice(null);
    setCalcMeta(null);
    setContactDraft(null);
    setBookingResult(null);
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
      guestCount,
      productQuantities,
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
      guestCount,
      productQuantities,
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
      slotMeta?: {
        duration: number | null;
        price: number | null;
        basePrice?: number | null;
      } | null
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
      setGuestCountState(Math.max(0, next.guestCount ?? 0));
      setProductQuantities({ ...(next.productQuantities ?? {}) });
      // Контакт / результат брони не в URL — сбрасываем при hydrate из ссылки
      setContactDraft(null);
      setBookingResult(null);
      setCalcMeta(null);
      if (slotMeta) {
        setSlotDuration(slotMeta.duration);
        setSlotPrice(slotMeta.price);
        const restored =
          (slotMeta.basePrice != null && slotMeta.basePrice > 0
            ? slotMeta.basePrice
            : null) ??
          (slotMeta.price != null && slotMeta.price > 0 ? slotMeta.price : null);
        setBasePrice(restored);
      } else {
        clearSlotMeta();
        setBasePrice(null);
      }
      // Deep-link с room → пин; иначе снимаем
      setRoomFocusPinned(Boolean(next.roomId));
    },
    [clearSlotMeta]
  );

  const title =
    stepId === "category"
      ? ROOT_TITLE
      : stepId === "setup"
        ? "Параметры"
        : stepId === "checkout" || stepId === "extras"
          ? "Оформление"
          : stepId === "verify"
            ? "Подтверждение"
            : stepId === "done"
              ? "Готово"
              : (categoryId && getCategoryConfig(categoryId)?.title) || ROOT_TITLE;

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

  const back = useCallback(() => {
    // verify и done: назад всегда на 4-й шаг (оформление)
    if (stepId === "done" || stepId === "verify") {
      setBookingResult(null);
      setStepId("checkout");
      return;
    }
    if (stepId === "checkout" || stepId === "extras") {
      setContactDraft(null);
      setBookingResult(null);
      setStepId("setup");
      return;
    }
    if (stepId === "setup") {
      setCheckIn(null);
      setCheckOut(null);
      setBanyaDate(null);
      setBanyaTimeFrom(null);
      setBanyaTimeTo(null);
      clearSetupExtras();
      clearSlotMeta();
      if (!roomFocusPinned) {
        setRoomId(null);
      }
      setStepId("object");
      return;
    }
    if (stepId === "object") {
      setStepId("category");
      setCategoryId(null);
      setRoomFocusPinned(false);
      clearObjectSelection();
    }
  }, [
    stepId,
    roomFocusPinned,
    clearObjectSelection,
    clearSetupExtras,
    clearSlotMeta,
  ]);

  /** Снять фокус с одной карточки → показать все объекты категории. */
  const showAllObjects = useCallback(() => {
    setRoomId(null);
    setCheckIn(null);
    setCheckOut(null);
    setBanyaDate(null);
    setBanyaTimeFrom(null);
    setBanyaTimeTo(null);
    setRoomFocusPinned(false);
    clearSetupExtras();
    clearSlotMeta();
    setStepId("object");
  }, [clearSetupExtras, clearSlotMeta]);

  /** Фокус на одну карточку на шаге object (deep-link без дат). */
  const objectFocus =
    stepId === "object" &&
    Boolean(roomId) &&
    !checkIn &&
    !checkOut &&
    !banyaDate;

  const canGoBack = stepId !== "category" && !objectFocus;

  const selectCategory = useCallback(
    (id: BookingCategoryId) => {
      setCategoryId(id);
      setRoomId(null);
      setCheckIn(null);
      setCheckOut(null);
      setBanyaDate(null);
      setBanyaTimeFrom(null);
      setBanyaTimeTo(null);
      setRoomFocusPinned(false);
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

  const setGuestCount = useCallback((next: number) => {
    setGuestCountState(Math.max(0, next));
    setBasePrice(null);
    setCalcMeta(null);
  }, []);

  const setProductQty = useCallback((productId: string, next: number) => {
    setProductQuantities((prev) => {
      const nextMap = { ...prev };
      if (next <= 0) delete nextMap[productId];
      else nextMap[productId] = next;
      return nextMap;
    });
  }, []);

  const setBasePriceResolved = useCallback(
    (
      price: number,
      meta?: import("./checkout/checkoutDraft").BookingCalcMeta
    ) => {
      setBasePrice(price);
      if (meta) setCalcMeta(meta);
    },
    []
  );

  const continueFromSetup = useCallback(() => {
    // extras (мультикорзина) временно пропускаем
    setStepId("checkout");
  }, []);

  const continueFromCheckout = useCallback(
    (contact: import("./checkout/checkoutDraft").CheckoutContactDraft) => {
      setContactDraft(contact);
      setBookingResult(null);
      setStepId("verify");
    },
    []
  );

  const completeBooking = useCallback(
    (result: import("./checkout/checkoutDraft").BookingResultDraft) => {
      setBookingResult(result);
      setStepId("done");
    },
    []
  );

  const startOver = useCallback(() => {
    setStepId("category");
    setCategoryId(null);
    setRoomFocusPinned(false);
    clearObjectSelection();
  }, [clearObjectSelection]);

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
        setCheckIn(null);
        setCheckOut(null);
        setBanyaDate(null);
        setBanyaTimeFrom(null);
        setBanyaTimeTo(null);
        clearSetupExtras();
        clearSlotMeta();
        if (!roomFocusPinned) {
          setRoomId(null);
        }
        return;
      }
      if (target === "setup") {
        setContactDraft(null);
        setBookingResult(null);
        setStepId("setup");
        return;
      }
      if (target === "checkout") {
        setBookingResult(null);
        setStepId("checkout");
        return;
      }
      if (target === "verify") {
        setBookingResult(null);
        setStepId("verify");
        return;
      }
      if (target === "extras") {
        return;
      }
      setStepId(target);
    },
    [stepId, roomFocusPinned, clearObjectSelection, clearSetupExtras, clearSlotMeta]
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
    contactDraft,
    bookingResult,
    calcMeta,
    title,
    canGoBack,
    objectFocus,
    selectCategory,
    selectHome,
    selectBanya,
    setGuestCount,
    setProductQty,
    setBasePriceResolved,
    continueFromSetup,
    continueFromCheckout,
    completeBooking,
    startOver,
    back,
    showAllObjects,
    goToStep,
    hydrate,
    snapshot,
  };
}

export { DEFAULT_BOOKING_URL_STATE };
