import { useEffect, useState } from "react";
import type { WidgetApiClient } from "../../../../api";
import type { BookingFlowDraft, CategoryId } from "../../types";
import {
  computeDurationHours,
  parseBanyaCalculateResponse,
  parseHomesCalculateResponse,
  type BanyaCalculateView,
  type HomesCalculateView,
} from "./bookingCalculate.utils";

type Args = {
  api: WidgetApiClient;
  categoryId: CategoryId | undefined;
  draft: BookingFlowDraft | null | undefined;
  onPriceResolved: (totalPrice: number) => void;
};

export function useBookingCalculate({
  api,
  categoryId,
  draft,
  onPriceResolved,
}: Args) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banyaCalc, setBanyaCalc] = useState<BanyaCalculateView | null>(null);
  const [homesCalc, setHomesCalc] = useState<HomesCalculateView | null>(null);

  const guestCount = draft?.guestCount ?? 0;

  useEffect(() => {
    if (!draft || !categoryId || guestCount < 1) {
      setBanyaCalc(null);
      setHomesCalc(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (categoryId === "homes") {
          if (!draft.checkInDate || !draft.checkOutDate || !draft.roomId) return;
          const res = await api.dailyCalculate({
            roomId: draft.roomId,
            checkInDate: draft.checkInDate,
            checkOutDate: draft.checkOutDate,
            personCount: guestCount,
          });
          if (cancelled) return;
          const view = parseHomesCalculateResponse(res);
          setHomesCalc(view);
          setBanyaCalc(null);
          onPriceResolved(view.total);
        } else if (categoryId === "banya") {
          if (!draft.date || !draft.timeFrom || !draft.timeTo || !draft.roomId) return;
          const duration =
            draft.slotDuration ??
            computeDurationHours(draft.timeFrom, draft.timeTo);
          const res = await api.calculateRoom({
            roomId: draft.roomId,
            date: draft.date,
            time: draft.timeFrom,
            duration,
            discounts: [],
            personCount: guestCount,
            promoCode: null,
            contactDiscount: 0,
            discountContactType: 0,
            manualDiscount: null,
          });
          if (cancelled) return;
          const view = parseBanyaCalculateResponse(res);
          setBanyaCalc(view);
          setHomesCalc(null);
          onPriceResolved(view.total);
        }
      } catch (err) {
        if (cancelled) return;
        setBanyaCalc(null);
        setHomesCalc(null);
        const message =
          err instanceof Error ? err.message : "Не удалось рассчитать стоимость";
        setError(message);
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
    categoryId,
    draft?.roomId,
    draft?.date,
    draft?.timeFrom,
    draft?.timeTo,
    draft?.checkInDate,
    draft?.checkOutDate,
    draft?.slotDuration,
    guestCount,
    onPriceResolved,
  ]);

  return {
    isLoading,
    error,
    banyaCalc,
    homesCalc,
    hasCalculation: Boolean(banyaCalc || homesCalc),
  };
}
