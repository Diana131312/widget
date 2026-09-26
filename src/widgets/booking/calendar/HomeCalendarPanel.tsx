import React, { useCallback, useEffect, useState } from "react";
import { startOfMonth } from "date-fns";
import type { WidgetApiClient, WidgetDailyRoom } from "../../../api";
import { useBookingToast } from "../ui/ToastContext";
import { DailyRangeCalendar } from "./DailyRangeCalendar";
import type { DailyDateRange } from "./dailyTypes";
import { expandOccupiedNights, loadDailyOccupied } from "./services";

type Props = {
  room: WidgetDailyRoom;
  api: WidgetApiClient;
  /** false — не грузить occupancy (карточка вне viewport). */
  enabled?: boolean;
  onContinue?: (payload: {
    room: WidgetDailyRoom;
    range: DailyDateRange;
  }) => void;
};

export const HomeCalendarPanel: React.FC<Props> = ({
  room,
  api,
  enabled = true,
  onContinue,
}) => {
  const { showToast } = useBookingToast();
  const [anchorMonth, setAnchorMonth] = useState(() => startOfMonth(new Date()));
  const [occupiedNights, setOccupiedNights] = useState<Set<string>>(
    () => new Set()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedRange, setSelectedRange] = useState<DailyDateRange | null>(
    null
  );

  useEffect(() => {
    if (!enabled) {
      setIsLoading(true);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);
    setSelectedRange(null);

    loadDailyOccupied(api, room.id, anchorMonth)
      .then((ranges) => {
        if (cancelled) return;
        setOccupiedNights(expandOccupiedNights(ranges));
      })
      .catch(() => {
        if (cancelled) return;
        setHasError(true);
        setOccupiedNights(new Set());
        setSelectedRange(null);
        showToast("Не удалось загрузить занятость дома. Попробуйте позже.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, api, room.id, anchorMonth, reloadToken, showToast]);

  const handleMonthChange = useCallback((monthStart: Date) => {
    setAnchorMonth(monthStart);
  }, []);

  const handleRetry = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  return (
    <div className="booking-cal-panel">
      <DailyRangeCalendar
        occupiedNights={occupiedNights}
        isLoading={isLoading}
        hasError={hasError}
        limits={{
          minNights: room.minNights,
          maxNights: room.maxNights,
        }}
        onMonthChange={handleMonthChange}
        onRangeChange={setSelectedRange}
        onRetry={handleRetry}
      />
      <button
        type="button"
        className="booking-cal__continue"
        disabled={!selectedRange || isLoading || hasError}
        onClick={() => {
          if (!selectedRange || hasError) return;
          onContinue?.({ room, range: selectedRange });
        }}
      >
        Далее →
      </button>
    </div>
  );
};
