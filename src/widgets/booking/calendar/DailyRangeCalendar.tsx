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
import { applyRangeDayClick, draftToSelectedRange } from "./rangeLogic";
import type { RangeLimits } from "./rangeLogic";

export type DailyRangeCalendarProps = {
  occupiedNights: Set<string>;
  isLoading?: boolean;
  hasError?: boolean;
  limits?: RangeLimits | null;
  onMonthChange?: (monthStart: Date) => void;
  onRangeChange?: (range: DailyDateRange | null) => void;
  onRetry?: () => void;
};

export function formatDailyRangeLabel(checkIn: string, checkOut: string): string {
  const start = parseISO(checkIn);
  const end = parseISO(checkOut);
  const sameMonth =
    format(start, "LLLL", { locale: ru }) === format(end, "LLLL", { locale: ru });
  if (sameMonth) {
    return `${format(start, "d", { locale: ru })} — ${format(end, "d MMMM", { locale: ru })}`;
  }
  return `${format(start, "d MMMM", { locale: ru })} — ${format(end, "d MMMM", { locale: ru })}`;
}

export function formatDayLabel(dateStr: string): string {
  return format(parseISO(dateStr), "d MMMM yyyy", { locale: ru });
}

export const DailyRangeCalendar: React.FC<DailyRangeCalendarProps> = ({
  occupiedNights,
  isLoading = false,
  hasError = false,
  limits = null,
  onMonthChange,
  onRangeChange,
  onRetry,
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
  const calendarEnd = useMemo(
    () => endOfWeek(monthEnd, { weekStartsOn: 1 }),
    [monthEnd]
  );
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
    return draftToSelectedRange(
      { start: rangeStart, end: rangeEnd },
      occupiedNights,
      limits
    );
  }, [rangeStart, rangeEnd, occupiedNights, limits]);

  useEffect(() => {
    onRangeChange?.(selectedRange);
  }, [selectedRange, onRangeChange]);

  useEffect(() => {
    if (!hasError) return;
    setRangeStart(null);
    setRangeEnd(null);
    setRangeError(null);
  }, [hasError]);

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

  const isInSelectedRange = useCallback(
    (dateStr: string) => {
      if (!rangeStart || !rangeEnd) return false;
      return dateStr > rangeStart && dateStr < rangeEnd;
    },
    [rangeStart, rangeEnd]
  );

  const handleDayClick = (dateStr: string) => {
    if (hasError || isLoading || isPastDate(dateStr)) return;

    const next = applyRangeDayClick(
      { start: rangeStart, end: rangeEnd },
      dateStr,
      occupiedNights,
      limits
    );
    setRangeStart(next.draft.start);
    setRangeEnd(next.draft.end);
    setRangeError(next.rangeError);
  };

  return (
    <div className="booking-cal booking-cal--range">
      <div className="booking-cal__nav">
        <button
          type="button"
          className="booking-cal__nav-btn"
          onClick={goToPreviousMonth}
          aria-label="Предыдущий месяц"
        >
          ←
        </button>
        <div className="booking-cal__month">{monthTitle}</div>
        <button
          type="button"
          className="booking-cal__nav-btn"
          onClick={goToNextMonth}
          aria-label="Следующий месяц"
        >
          →
        </button>
      </div>

      {isLoading && (
        <div className="booking-cal__status">Загрузка занятости…</div>
      )}
      {hasError && !isLoading && (
        <div className="booking-cal__status booking-cal__status--error">
          <span>Не удалось загрузить занятость</span>
          {onRetry ? (
            <button
              type="button"
              className="booking-cal__retry"
              onClick={onRetry}
            >
              Повторить
            </button>
          ) : null}
        </div>
      )}

      <div className="booking-cal__weekdays">
        {["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((day) => (
          <div key={day} className="booking-cal__weekday">
            {day}
          </div>
        ))}
      </div>

      <div className="booking-cal__grid">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="booking-cal__week">
            {week.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const inCurrentMonth = isSameMonth(day, currentMonth);
              const past = isPastDate(dateStr);
              const occupied = isOccupied(dateStr);
              const isStart = rangeStart === dateStr;
              const isEnd = rangeEnd === dateStr;
              const inRange = isInSelectedRange(dateStr);

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={!inCurrentMonth || isLoading || past || hasError}
                  className={[
                    "booking-cal__day",
                    "booking-cal__day--range",
                    !inCurrentMonth && "booking-cal__day--muted",
                    past && "booking-cal__day--past",
                    hasError && "booking-cal__day--blocked",
                    occupied && !past && "booking-cal__day--occupied",
                    !past && inCurrentMonth && !occupied && !hasError && "booking-cal__day--free",
                    (isStart || isEnd || inRange) && "booking-cal__day--picked",
                    isStart && "booking-cal__day--start",
                    isEnd && "booking-cal__day--end",
                    inRange && "booking-cal__day--in-range",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleDayClick(dateStr)}
                  aria-label={format(day, "d MMMM yyyy", { locale: ru })}
                  aria-pressed={isStart || isEnd}
                >
                  <span className="booking-cal__num">{format(day, "d")}</span>
                  {inCurrentMonth && past && (
                    <div className="booking-cal__placeholder">—</div>
                  )}
                  {inCurrentMonth && !past && hasError && (
                    <div className="booking-cal__bar-error" title="Ошибка">
                      !
                    </div>
                  )}
                  {inCurrentMonth && !past && !hasError && (
                    <div className="booking-cal__bar" aria-hidden>
                      <div
                        className={
                          occupied
                            ? "booking-cal__bar-busy"
                            : "booking-cal__bar-free"
                        }
                        style={{ width: "100%" }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="booking-cal__error-slot" aria-live="polite">
        {rangeError ? (
          <p className="booking-cal__error" role="alert">
            {rangeError}
          </p>
        ) : null}
      </div>

      <p className="booking-cal__range-meta" aria-live="polite">
        <span className="booking-cal__range-label">Начало</span>
        <span
          className={[
            "booking-cal__range-value",
            !rangeStart ? "booking-cal__range-value--empty" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {rangeStart ? formatDayLabel(rangeStart) : "—"}
        </span>
        <span className="booking-cal__range-sep" aria-hidden>
          ·
        </span>
        <span className="booking-cal__range-label">Окончание</span>
        <span
          className={[
            "booking-cal__range-value",
            !rangeEnd ? "booking-cal__range-value--empty" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {rangeEnd ? formatDayLabel(rangeEnd) : "—"}
        </span>
      </p>
    </div>
  );
};
