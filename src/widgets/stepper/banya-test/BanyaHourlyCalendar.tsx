import React, { useEffect, useMemo, useState } from "react";
import { format, parseISO, startOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import type { WidgetApiClient } from "../../../api";
import { MonthlyCalendar } from "../calendar/MonthlyCalendar";
import {
  convertToMonthlyOccupancyData,
  loadMonthlyAvailabilityForRoom,
} from "../calendar/availabilityService";
import type { MonthlyOccupancyData } from "../calendar/types";

type Props = {
  roomId: string;
  roomName: string;
  api: WidgetApiClient;
  selectedDate: string | null;
  onDateSelect: (dateStr: string) => void;
};

export const BanyaHourlyCalendar: React.FC<Props> = ({
  roomId,
  roomName,
  api,
  selectedDate,
  onDateSelect,
}) => {
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));
  const [monthlyData, setMonthlyData] = useState<MonthlyOccupancyData>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    loadMonthlyAvailabilityForRoom(api, roomId, monthStart)
      .then((response) => {
        if (cancelled) return;
        setMonthlyData(convertToMonthlyOccupancyData(monthStart, response));
      })
      .catch(() => {
        if (cancelled) return;
        setHasError(true);
        setMonthlyData([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, roomId, monthStart]);

  const selectedDateObj = useMemo(
    () => (selectedDate ? parseISO(selectedDate) : null),
    [selectedDate]
  );

  const selectedLabel = useMemo(() => {
    if (!selectedDate) return null;
    try {
      return format(parseISO(selectedDate), "d MMMM yyyy", { locale: ru });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div className="banya-hourly-calendar">
      <MonthlyCalendar
        data={monthlyData}
        roomName={roomName}
        initialDate={monthStart}
        onMonthChange={setMonthStart}
        isLoading={isLoading}
        hasError={hasError}
        selectedDate={selectedDateObj}
        onDateClick={(date) => onDateSelect(format(date, "yyyy-MM-dd"))}
      />
      {selectedLabel && (
        <p className="banya-hourly-calendar__selected">
          Выбрано: {selectedLabel}
        </p>
      )}
    </div>
  );
};
