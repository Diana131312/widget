import React from "react";
import { WORK_DAY_START, WORK_DAY_END } from "./types";

type Props = {
  bookedRanges: Array<{ start: string; end: string }>;
  bookedPercent?: number;
  workHours?: boolean[];
  workDayStart?: string;
  workDayEnd?: string;
};

/**
 * Компонент прогресс-бара занятости для одного дня
 * Красная часть = занято, зеленая часть = свободно
 */
export const OccupancyBar: React.FC<Props> = ({
  bookedRanges,
  bookedPercent,
  workHours,
  workDayStart = WORK_DAY_START, // "09:00"
  workDayEnd = WORK_DAY_END, // "24:00"
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

  const computedBookedPercent = workDuration > 0 ? (bookedMinutes / workDuration) * 100 : 0;
  const safeBookedPercent = Math.max(
    0,
    Math.min(100, bookedPercent ?? computedBookedPercent)
  );

  const workHourCount = Math.max(0, Math.round(workDuration / 60));
  const safeWorkHours =
    Array.isArray(workHours) && workHours.length > 0
      ? workHours.slice(0, workHourCount)
      : null;

  return (
    <div className="stepper-calendar__occupancy-bar">
      {safeWorkHours ? (
        safeWorkHours.map((isFree, index) => (
          <div
            key={index}
            className={
              isFree
                ? "stepper-calendar__occupancy-bar-free"
                : "stepper-calendar__occupancy-bar-filled"
            }
            style={{
              width: `${100 / safeWorkHours.length}%`,
              backgroundColor: isFree ? "#22c55e" : "#ef4444",
            }}
          />
        ))
      ) : (
        <div
          className="stepper-calendar__occupancy-bar-filled"
          style={{
            width: `${safeBookedPercent}%`,
            backgroundColor: "#ef4444",
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
