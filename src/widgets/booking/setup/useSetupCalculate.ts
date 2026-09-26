import { useCallback, useEffect, useRef, useState } from "react";
import type { WidgetApiClient } from "../../../api";
import type { BookingCategoryId } from "../types";
import { getBootstrapErrorCopy } from "../ui/errorMessages";
import {
  computeDurationHours,
  parseBanyaCalculateResponse,
  parseHomesCalculateResponse,
  type BanyaCalculateView,
  type HomesCalculateView,
} from "./calculate.utils";

type SetupCalculateInput = {
  categoryId: BookingCategoryId;
  roomId: string;
  guestCount: number;
  checkIn: string | null;
  checkOut: string | null;
  banyaDate: string | null;
  banyaTimeFrom: string | null;
  banyaTimeTo: string | null;
  /** Длительность слота из выбора (часы) — приоритетнее вычисления из from/to. */
  slotDuration: number | null;
  /** Цена слота — fallback, если API не вернул total. */
  slotPrice: number | null;
};

type Args = {
  api: WidgetApiClient;
  input: SetupCalculateInput | null;
  onPriceResolved: (totalPrice: number) => void;
};

export function useSetupCalculate({ api, input, onPriceResolved }: Args) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banyaCalc, setBanyaCalc] = useState<BanyaCalculateView | null>(null);
  const [homesCalc, setHomesCalc] = useState<HomesCalculateView | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const guestCount = input?.guestCount ?? 0;
  const onPriceResolvedRef = useRef(onPriceResolved);
  onPriceResolvedRef.current = onPriceResolved;

  const retry = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!input) {
      setBanyaCalc(null);
      setHomesCalc(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (guestCount < 1) {
      setBanyaCalc(null);
      setHomesCalc(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    // Сразу убираем стейл прошлых цифр — иначе 350ms «ломаный» расчёт с basePrice=0.
    setIsLoading(true);
    setError(null);
    setBanyaCalc(null);
    setHomesCalc(null);

    const timer = window.setTimeout(async () => {
      try {
        if (input.categoryId === "homes") {
          if (!input.checkIn || !input.checkOut || !input.roomId) {
            if (!cancelled) {
              setError("Не хватает дат для расчёта");
              setIsLoading(false);
            }
            return;
          }
          const res = await api.dailyCalculate({
            roomId: input.roomId,
            checkInDate: input.checkIn,
            checkOutDate: input.checkOut,
            personCount: guestCount,
          });
          if (cancelled) return;
          const view = parseHomesCalculateResponse(res);
          if (view.total <= 0) {
            setHomesCalc(null);
            setBanyaCalc(null);
            setError("Сервер вернул пустую стоимость. Попробуйте ещё раз");
            return;
          }
          setHomesCalc(view);
          setBanyaCalc(null);
          onPriceResolvedRef.current(view.total);
        } else if (input.categoryId === "banya") {
          if (
            !input.banyaDate ||
            !input.banyaTimeFrom ||
            !input.banyaTimeTo ||
            !input.roomId
          ) {
            if (!cancelled) {
              setError("Не хватает слота для расчёта");
              setIsLoading(false);
            }
            return;
          }
          const duration =
            input.slotDuration != null && input.slotDuration > 0
              ? input.slotDuration
              : computeDurationHours(input.banyaTimeFrom, input.banyaTimeTo);
          const res = await api.calculateRoom({
            roomId: input.roomId,
            date: input.banyaDate,
            time: input.banyaTimeFrom,
            duration,
            discounts: [],
            personCount: guestCount,
            promoCode: null,
            contactDiscount: 0,
            discountContactType: 0,
            manualDiscount: null,
          });
          if (cancelled) return;
          let view = parseBanyaCalculateResponse(res);
          if (view.total <= 0 && input.slotPrice != null && input.slotPrice > 0) {
            view = {
              ...view,
              total: input.slotPrice,
              basePrice: input.slotPrice,
              lines:
                view.lines.length > 0
                  ? view.lines
                  : [{ label: "Стоимость бани", amount: input.slotPrice }],
            };
          }
          if (view.total <= 0) {
            setBanyaCalc(null);
            setHomesCalc(null);
            setError("Сервер вернул пустую стоимость. Попробуйте ещё раз");
            return;
          }
          setBanyaCalc(view);
          setHomesCalc(null);
          onPriceResolvedRef.current(view.total);
        }
      } catch (err) {
        if (cancelled) return;
        setBanyaCalc(null);
        setHomesCalc(null);
        const { detail } = getBootstrapErrorCopy(err);
        setError(detail);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    api,
    guestCount,
    input?.categoryId,
    input?.roomId,
    input?.checkIn,
    input?.checkOut,
    input?.banyaDate,
    input?.banyaTimeFrom,
    input?.banyaTimeTo,
    input?.slotDuration,
    input?.slotPrice,
    reloadToken,
  ]);

  return {
    isLoading,
    error,
    banyaCalc,
    homesCalc,
    hasCalculation: Boolean(banyaCalc || homesCalc),
    retry,
  };
}
