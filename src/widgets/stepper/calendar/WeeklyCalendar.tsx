import React, { useState, useMemo } from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  format,
  isSameDay,
  isPast,
  startOfDay,
} from "date-fns";
import { ru } from "date-fns/locale";
import type { WeeklyOccupancyData } from "./types";
import { OccupancyBar } from "./OccupancyBar";

type Props = {
  data: WeeklyOccupancyData;
  initialDate?: Date;
  onWeekChange?: (weekStart: Date) => void;
  isLoading?: boolean;
  loadingRooms?: Set<string>; // ID бань, которые еще загружаются
  errorRooms?: Set<string>; // ID бань с ошибками
  onDateClick?: (roomId: string, date: Date) => void; // Обработчик клика на день
  selectedDate?: Date | null; // Выбранная дата для визуального выделения
  selectedRoomId?: string | null; // Выбранная баня для визуального выделения
};

/**
 * Недельный календарь для режима "Все бани"
 * Показывает одну неделю (7 дней) с навигацией вперед/назад
 */
export const WeeklyCalendar: React.FC<Props> = ({
  data,
  initialDate = new Date(),
  onWeekChange,
  isLoading = false,
  loadingRooms = new Set(),
  errorRooms = new Set(),
  onDateClick,
  selectedDate,
  selectedRoomId,
}) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(initialDate, { weekStartsOn: 1 })
  );

  const weekEnd = useMemo(
    () => endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    [currentWeekStart]
  );

  const weekDays = useMemo(
    () => eachDayOfInterval({ start: currentWeekStart, end: weekEnd }),
    [currentWeekStart, weekEnd]
  );

  const weekDaysMeta = useMemo(
    () =>
      weekDays.map((day) => ({
        day,
        key: day.toISOString(),
        isPastDay: isPast(startOfDay(day)) && !isSameDay(day, new Date()),
      })),
    [weekDays]
  );

  const weekRangeText = useMemo(() => {
    const startDay = format(currentWeekStart, "d", { locale: ru });
    const endDay = format(weekEnd, "d MMMM yyyy", { locale: ru });
    return `${startDay}-${endDay}`;
  }, [currentWeekStart, weekEnd]);

  const goToPreviousWeek = () => {
    const newWeek = addWeeks(currentWeekStart, -1);
    setCurrentWeekStart(newWeek);
    onWeekChange?.(newWeek);
  };

  const goToNextWeek = () => {
    const newWeek = addWeeks(currentWeekStart, 1);
    setCurrentWeekStart(newWeek);
    onWeekChange?.(newWeek);
  };

  const getDayOccupancy = (roomId: string, date: Date) => {
    const room = data.find((r) => r.roomId === roomId);
    if (!room) return { bookedRanges: [], bookedPercent: 0, workHours: [] };
    const day = room.days.find((d) => isSameDay(d.date, date));
    return day || { bookedRanges: [], bookedPercent: 0, workHours: [] };
  };

  return (
    <div className="stepper-calendar stepper-calendar--weekly">
      {/* Навигация */}
      <div className="stepper-calendar__navigation">
        <button
          type="button"
          className="stepper-calendar__nav-btn"
          onClick={goToPreviousWeek}
          aria-label="Предыдущая неделя"
        >
          ←
        </button>
        <div className="stepper-calendar__date-range">{weekRangeText}</div>
        <button
          type="button"
          className="stepper-calendar__nav-btn"
          onClick={goToNextWeek}
          aria-label="Следующая неделя"
        >
          →
        </button>
      </div>

      {/* Строки для каждой бани */}
      {data.map((room) => {
        const isRoomLoading = loadingRooms.has(room.roomId);
        const hasRoomError = errorRooms.has(room.roomId);

        return (
          <div key={room.roomId} className="stepper-calendar__room-row">
            {/* Название бани отдельной строкой */}
            <div className="stepper-calendar__room-name-row">
              <div className="stepper-calendar__room-name">{room.roomName}</div>
            </div>

            {/* Дни недели */}
            <div className="stepper-calendar__weekdays-row">
              {weekDaysMeta.map(({ day, key, isPastDay }) => (
                <div
                  key={key}
                  className={`stepper-calendar__weekday-cell ${isPastDay ? "stepper-calendar__weekday-cell--past" : ""}`}
                >
                  <div className="stepper-calendar__weekday">
                    {format(day, "EEE", { locale: ru }).toUpperCase()}
                  </div>
                </div>
              ))}
            </div>

            {/* Числа */}
            <div className="stepper-calendar__numbers-row">
              {weekDaysMeta.map(({ day, key, isPastDay }) => {
                const isSelected =
                  selectedDate && selectedRoomId === room.roomId && isSameDay(day, selectedDate);
                const clickable = Boolean(onDateClick && !isPastDay);
                return (
                  <div
                    key={key}
                    className={`stepper-calendar__number-cell ${isSelected ? "stepper-calendar__number-cell--selected" : ""} ${clickable ? "stepper-calendar__number-cell--clickable" : ""} ${isPastDay ? "stepper-calendar__number-cell--past" : ""}`}
                    onClick={() => {
                      if (clickable && onDateClick) {
                        onDateClick(room.roomId, day);
                      }
                    }}
                  >
                    <div className="stepper-calendar__day-number">
                      {format(day, "d")}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Линии занятости или скелетоны/ошибки */}
            <div className="stepper-calendar__bars-row">
              {weekDaysMeta.map(({ day, key, isPastDay }) => {
                const isSelected =
                  selectedDate && selectedRoomId === room.roomId && isSameDay(day, selectedDate);

                if (isPastDay) {
                  return (
                    <div
                      key={key}
                      className={`stepper-calendar__bar-cell stepper-calendar__bar-cell--past ${isSelected ? "stepper-calendar__bar-cell--selected" : ""}`}
                    >
                      <div className="stepper-calendar__day-placeholder">—</div>
                    </div>
                  );
                }

                if (isRoomLoading) {
                  return (
                    <div
                      key={key}
                      className={`stepper-calendar__bar-cell ${isSelected ? "stepper-calendar__bar-cell--selected" : ""}`}
                    >
                      <div className="stepper-calendar__occupancy-bar-skeleton" />
                    </div>
                  );
                }

                if (hasRoomError) {
                  return (
                    <div
                      key={key}
                      className={`stepper-calendar__bar-cell ${isSelected ? "stepper-calendar__bar-cell--selected" : ""}`}
                    >
                      <div className="stepper-calendar__occupancy-bar-error">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      </div>
                    </div>
                  );
                }

                const occupancy = getDayOccupancy(room.roomId, day);
                const clickable = Boolean(onDateClick);
                return (
                  <div
                    key={key}
                    className={`stepper-calendar__bar-cell ${isSelected ? "stepper-calendar__bar-cell--selected" : ""} ${clickable ? "stepper-calendar__bar-cell--clickable" : ""}`}
                    onClick={() => {
                      if (clickable && onDateClick) {
                        onDateClick(room.roomId, day);
                      }
                    }}
                  >
                    <OccupancyBar
                      bookedRanges={occupancy.bookedRanges}
                      bookedPercent={occupancy.bookedPercent}
                      workHours={occupancy.workHours}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
