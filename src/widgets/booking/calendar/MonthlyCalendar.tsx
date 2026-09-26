import React, { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isPast,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ru } from "date-fns/locale";
import type { MonthlyOccupancyData } from "./services";
import { OccupancyBar } from "./OccupancyBar";

type Props = {
  data: MonthlyOccupancyData;
  initialDate?: Date;
  onMonthChange?: (monthStart: Date) => void;
  isLoading?: boolean;
  hasError?: boolean;
  onDateClick?: (date: Date) => void;
  selectedDate?: Date | null;
  onRetry?: () => void;
};

export const MonthlyCalendar: React.FC<Props> = ({
  data,
  initialDate = new Date(),
  onMonthChange,
  isLoading = false,
  hasError = false,
  onDateClick,
  selectedDate,
  onRetry,
}) => {
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(initialDate)
  );

  // Только месяц родителя — не прыгать назад на месяц selectedDate
  // (иначе «←» при выбранном дне откатывает вид и крутит загрузку).
  useEffect(() => {
    const m = startOfMonth(initialDate);
    setCurrentMonth((prev) => (prev.getTime() === m.getTime() ? prev : m));
  }, [initialDate]);

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

  const monthTitle = useMemo(
    () => format(currentMonth, "LLLL yyyy", { locale: ru }),
    [currentMonth]
  );

  const occupancyByDate = useMemo(() => {
    const map = new Map<string, MonthlyOccupancyData[number]>();
    data.forEach((entry) => {
      map.set(format(entry.date, "yyyy-MM-dd"), entry);
    });
    return map;
  }, [data]);

  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

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

  return (
    <div className="booking-cal booking-cal--monthly">
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
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isPastDay =
                isPast(startOfDay(day)) && !isSameDay(day, new Date());
              const occupancy =
                occupancyByDate.get(format(day, "yyyy-MM-dd")) || {
                  bookedRanges: [],
                  bookedPercent: 0,
                  workHours: [],
                };
              const isSelected =
                selectedDate != null && isSameDay(day, selectedDate);

              const canPick =
                isCurrentMonth &&
                !isPastDay &&
                !isLoading &&
                !hasError &&
                Boolean(onDateClick);

              return (
                <div
                  key={day.toISOString()}
                  className={[
                    "booking-cal__day",
                    "booking-cal__day--monthly",
                    !isCurrentMonth && "booking-cal__day--muted",
                    isPastDay && "booking-cal__day--past",
                    hasError && isCurrentMonth && !isPastDay && "booking-cal__day--blocked",
                    isSelected && "booking-cal__day--selected",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    if (canPick) onDateClick?.(day);
                  }}
                  role={canPick ? "button" : undefined}
                  tabIndex={canPick ? 0 : undefined}
                  aria-disabled={!canPick}
                  aria-label={format(day, "d MMMM yyyy", { locale: ru })}
                  onKeyDown={(e) => {
                    if (
                      (e.key === "Enter" || e.key === " ") &&
                      canPick
                    ) {
                      e.preventDefault();
                      onDateClick?.(day);
                    }
                  }}
                >
                  <div className="booking-cal__num">{format(day, "d")}</div>
                  {isCurrentMonth && !isPastDay && (
                    <>
                      {isLoading ? (
                        <div className="booking-cal__bar-skeleton" />
                      ) : hasError ? (
                        <div className="booking-cal__bar-error" title="Ошибка">
                          !
                        </div>
                      ) : (
                        <OccupancyBar
                          bookedRanges={occupancy.bookedRanges}
                          bookedPercent={occupancy.bookedPercent}
                          workHours={occupancy.workHours}
                        />
                      )}
                    </>
                  )}
                  {isCurrentMonth && isPastDay && (
                    <div className="booking-cal__placeholder">—</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
