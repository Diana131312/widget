import React, { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isPast,
  startOfDay,
} from "date-fns";
import { ru } from "date-fns/locale";
import type { MonthlyOccupancyData } from "./types";
import { OccupancyBar } from "./OccupancyBar";

type Props = {
  data: MonthlyOccupancyData;
  roomName: string;
  initialDate?: Date;
  onMonthChange?: (monthStart: Date) => void;
  isLoading?: boolean;
  hasError?: boolean;
  onDateClick?: (date: Date) => void;
  selectedDate?: Date | null;
};

/**
 * Месячный календарь для режима "Конкретная баня"
 * Показывает один месяц с навигацией вперед/назад
 */
export const MonthlyCalendar: React.FC<Props> = ({
  data,
  roomName,
  initialDate = new Date(),
  onMonthChange,
  isLoading = false,
  hasError = false,
  onDateClick,
  selectedDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(initialDate)
  );

  const monthEnd = useMemo(
    () => endOfMonth(currentMonth),
    [currentMonth]
  );

  // Получаем первую и последнюю неделю месяца (для отображения полной сетки)
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

  const goToPreviousMonth = () => {
    const newMonth = addMonths(currentMonth, -1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const goToNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const occupancyByDate = useMemo(() => {
    const map = new Map<string, MonthlyOccupancyData[number]>();

  
    data.forEach((entry) => {
      map.set(format(entry.date, "yyyy-MM-dd"), entry);
    });
    return map;
  }, [data]);

  const getDayOccupancy = (date: Date) => {
   

    const day = occupancyByDate.get(format(date, "yyyy-MM-dd"));
    return day || { bookedRanges: [], bookedPercent: 0, workHours: [] };
  };

  // Группируем дни по неделям
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="stepper-calendar stepper-calendar--monthly">
      {/* Навигация */}
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

      {/* Заголовок дней недели */}
      <div className="stepper-calendar__weekdays-header">
        {["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((day) => (
          <div key={day} className="stepper-calendar__weekday">
            {day}
          </div>
        ))}
      </div>

      {/* Сетка дней месяца */}
      <div className="stepper-calendar__month-grid">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="stepper-calendar__week-row">
            {week.map((day) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isPastDay = isPast(startOfDay(day)) && !isSameDay(day, new Date());
              const occupancy = getDayOccupancy(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <div
                  key={day.toISOString()}
                  className={`stepper-calendar__day-cell ${
                    !isCurrentMonth ? "stepper-calendar__day-cell--other-month" : ""
                  } ${isPastDay ? "stepper-calendar__day-cell--past" : ""} ${
                    isSelected ? "stepper-calendar__day-cell--selected" : ""
                  }`}
                  onClick={() => {
                    if (isCurrentMonth && !isPastDay && onDateClick) {
                      onDateClick(day);
                    }
                  }}
                >
                  <div className="stepper-calendar__day-number">
                    {format(day, "d")}
                  </div>
                  {isCurrentMonth && !isPastDay && (
                    <>
                      {isLoading ? (
                        <div className="stepper-calendar__occupancy-bar-skeleton" />
                      ) : hasError ? (
                        <div className="stepper-calendar__occupancy-bar-error">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
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
                    <div className="stepper-calendar__day-placeholder">—</div>
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
