import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ru } from "date-fns/locale";
import type { DailyDateRange } from "./dailyTypes";
import { countNights, rangeHasOccupiedNights } from "./dailyOccupiedService";

export type DailyRangeCalendarProps = {
  occupiedNights: Set<string>;
  isLoading?: boolean;
  hasError?: boolean;
  onMonthChange?: (monthStart: Date) => void;
  onRangeChange?: (range: DailyDateRange | null) => void;
};

export function formatDailyRangeLabel(checkIn: string, checkOut: string): string {
  const start = parseISO(checkIn);
  const end = parseISO(checkOut);
  const sameMonth = format(start, "LLLL", { locale: ru }) === format(end, "LLLL", { locale: ru });
  if (sameMonth) {
    return `${format(start, "d", { locale: ru })} — ${format(end, "d MMMM", { locale: ru })}`;
  }
  return `${format(start, "d MMMM", { locale: ru })} — ${format(end, "d MMMM", { locale: ru })}`;
}

export const DailyRangeCalendar: React.FC<DailyRangeCalendarProps> = ({
  occupiedNights,
  isLoading = false,
  hasError = false,
  onMonthChange,
  onRangeChange,
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);

  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);
  const calendarStart = useMemo(
    () => startOfWeek(currentMonth, { weekStartsOn: 1 }),
    [currentMonth]
  );
  const calendarEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd]);
  const calendarDays = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart, calendarEnd]
  );

  const weeks = useMemo(() => {
    const rows: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      rows.push(calendarDays.slice(i, i + 7));
    }
    return rows;
  }, [calendarDays]);

  const monthTitle = useMemo(
    () => format(currentMonth, "LLLL yyyy", { locale: ru }),
    [currentMonth]
  );

  const selectedRange = useMemo<DailyDateRange | null>(() => {
    if (!rangeStart || !rangeEnd) return null;
    const nights = countNights(rangeStart, rangeEnd);
    if (nights < 1) return null;
    return {
      checkIn: rangeStart,
      checkOut: rangeEnd,
      nights,
    };
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    onRangeChange?.(selectedRange);
  }, [selectedRange, onRangeChange]);

  const goToPreviousMonth = () => {
    const next = addMonths(currentMonth, -1);
    setCurrentMonth(next);
    onMonthChange?.(next);
  };

  const goToNextMonth = () => {
    const next = addMonths(currentMonth, 1);
    setCurrentMonth(next);
    onMonthChange?.(next);
  };

  const isPastDate = useCallback(
    (dateStr: string) => isBefore(parseISO(dateStr), today),
    [today]
  );

  const isOccupied = useCallback(
    (dateStr: string) => occupiedNights.has(dateStr),
    [occupiedNights]
  );

  const isSelectable = useCallback(
    (dateStr: string) => !isPastDate(dateStr) && !isOccupied(dateStr),
    [isPastDate, isOccupied]
  );

  const isInSelectedRange = useCallback(
    (dateStr: string) => {
      if (!rangeStart || !rangeEnd) return false;
      return dateStr > rangeStart && dateStr < rangeEnd;
    },
    [rangeStart, rangeEnd]
  );

  const handleDayClick = (dateStr: string) => {
    if (!isSelectable(dateStr)) return;

    setRangeError(null);

    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(dateStr);
      setRangeEnd(null);
      return;
    }

    const [checkIn, checkOut] =
      dateStr >= rangeStart ? [rangeStart, dateStr] : [dateStr, rangeStart];

    if (checkIn === checkOut) {
      setRangeStart(checkIn);
      setRangeEnd(null);
      return;
    }

    if (rangeHasOccupiedNights(checkIn, checkOut, occupiedNights)) {
      setRangeError("В выбранном периоде есть занятые даты. Выберите другой диапазон.");
      return;
    }

    setRangeStart(checkIn);
    setRangeEnd(checkOut);
  };

  return (
    <div className="stepper-calendar stepper-calendar--daily-range">
      <div className="stepper-calendar__navigation">
        <button
          type="button"
          className="stepper-calendar__nav-btn"
          onClick={goToPreviousMonth}
          aria-label="Предыдущий месяц"
        >
          ←
        </button>
        <div className="stepper-calendar__month-title">{monthTitle}</div>
        <button
          type="button"
          className="stepper-calendar__nav-btn"
          onClick={goToNextMonth}
          aria-label="Следующий месяц"
        >
          →
        </button>
      </div>

      {isLoading && (
        <div className="daily-range-calendar__status daily-range-calendar__status--loading">
          Загрузка занятости…
        </div>
      )}

      {hasError && !isLoading && (
        <div className="daily-range-calendar__status daily-range-calendar__status--error">
          Не удалось загрузить занятость. Попробуйте сменить месяц.
        </div>
      )}

      <div className="stepper-calendar__weekdays-header">
        {["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((day) => (
          <div key={day} className="stepper-calendar__weekday">
            {day}
          </div>
        ))}
      </div>

      <div className="stepper-calendar__month-grid stepper-calendar__month-grid--daily">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="stepper-calendar__week-row">
            {week.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const inCurrentMonth = isSameMonth(day, currentMonth);
              const past = isPastDate(dateStr);
              const occupied = isOccupied(dateStr);
              const selectable = isSelectable(dateStr);
              const isStart = rangeStart === dateStr;
              const isEnd = rangeEnd === dateStr;
              const inRange = isInSelectedRange(dateStr);

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={!inCurrentMonth || past || occupied || isLoading}
                  className={[
                    "stepper-calendar__day-cell",
                    "stepper-calendar__day-cell--daily",
                    !inCurrentMonth && "stepper-calendar__day-cell--other-month",
                    past && "stepper-calendar__day-cell--past",
                    occupied && "stepper-calendar__day-cell--occupied",
                    selectable && inCurrentMonth && "stepper-calendar__day-cell--free",
                    isStart && "stepper-calendar__day-cell--range-start",
                    isEnd && "stepper-calendar__day-cell--range-end",
                    inRange && "stepper-calendar__day-cell--in-range",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleDayClick(dateStr)}
                  aria-label={format(day, "d MMMM yyyy", { locale: ru })}
                  aria-pressed={isStart || isEnd}
                >
                  <span className="stepper-calendar__day-number">{format(day, "d")}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {rangeError && (
        <p className="daily-range-calendar__range-error" role="alert">
          {rangeError}
        </p>
      )}

      {selectedRange && (
        <div className="daily-range-calendar__summary">
          <p className="daily-range-calendar__summary-dates">
            Выбрано:{" "}
            {formatDailyRangeLabel(selectedRange.checkIn, selectedRange.checkOut)}
          </p>
        </div>
      )}
    </div>
  );
};
