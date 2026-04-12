import React from "react";
import { WORK_DAY_START, WORK_DAY_END } from "./types";

type Props = {
  bookedRanges: Array<{ start: string; end: string }>;
  workDayStart?: string;
  workDayEnd?: string;
};

/**
 * Компонент прогресс-бара занятости для одного дня
 * Красная часть = занято, зеленая часть = свободно
 */
export const OccupancyBar: React.FC<Props> = ({
  bookedRanges,
  workDayStart = WORK_DAY_START, // "09:00"
  workDayEnd = WORK_DAY_END, // "23:00"
}) => {
  const workStartMinutes = timeToMinutes(workDayStart);
  const workEndMinutes = timeToMinutes(workDayEnd);
  const workDuration = workEndMinutes - workStartMinutes;

  if (workDuration <= 0) {
    // Защита от некорректных данных
    return (
      <div className="stepper-calendar__occupancy-bar">
        <div className="stepper-calendar__occupancy-bar-free" style={{ width: "100%", backgroundColor: "#22c55e" }} />
      </div>
    );
  }

  // Вычисляем занятые минуты
  // Важно: учитываем только пересечение диапазонов с рабочим днем
  const bookedMinutes = bookedRanges.reduce((total, range) => {
    const rangeStart = timeToMinutes(range.start);
    const rangeEnd = timeToMinutes(range.end);
    
    // Находим пересечение диапазона с рабочим днем
    const start = Math.max(rangeStart, workStartMinutes);
    const end = Math.min(rangeEnd, workEndMinutes);
    
    // Добавляем только если есть пересечение
    const overlap = Math.max(0, end - start);
    return total + overlap;
  }, 0);

  const freeMinutes = workDuration - bookedMinutes;
  const bookedPercent = workDuration > 0 ? (bookedMinutes / workDuration) * 100 : 0;
  const freePercent = workDuration > 0 ? (freeMinutes / workDuration) * 100 : 100;

  // Ограничиваем проценты до 0-100 для безопасности
  const safeBookedPercent = Math.max(0, Math.min(100, bookedPercent));
  const safeFreePercent = Math.max(0, Math.min(100, freePercent));

  return (
    <div className="stepper-calendar__occupancy-bar">
      {safeBookedPercent > 0 && (
        <div
          className="stepper-calendar__occupancy-bar-filled"
          style={{
            width: `${safeBookedPercent}%`,
            backgroundColor: "#ef4444", // red-500
          }}
        />
      )}
      {safeFreePercent > 0 && (
        <div
          className="stepper-calendar__occupancy-bar-free"
          style={{
            width: `${safeFreePercent}%`,
            backgroundColor: "#22c55e", // green-500
          }}
        />
      )}
    </div>
  );
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
