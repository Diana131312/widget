import React from "react";
import { WORK_DAY_END, WORK_DAY_START } from "./services";

type Props = {
  bookedRanges: Array<{ start: string; end: string }>;
  bookedPercent?: number;
  workHours?: boolean[];
  workDayStart?: string;
  workDayEnd?: string;
};

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export const OccupancyBar: React.FC<Props> = ({
  bookedRanges,
  bookedPercent,
  workHours,
  workDayStart = WORK_DAY_START,
  workDayEnd = WORK_DAY_END,
}) => {
  const workStartMinutes = timeToMinutes(workDayStart);
  const workEndMinutes = timeToMinutes(workDayEnd);
  const workDuration = workEndMinutes - workStartMinutes;

  if (workDuration <= 0) {
    return (
      <div className="booking-cal__bar">
        <div className="booking-cal__bar-free" style={{ width: "100%" }} />
      </div>
    );
  }

  const bookedMinutes = bookedRanges.reduce((total, range) => {
    const rangeStart = timeToMinutes(range.start);
    const rangeEnd = timeToMinutes(range.end);
    const start = Math.max(rangeStart, workStartMinutes);
    const end = Math.min(rangeEnd, workEndMinutes);
    return total + Math.max(0, end - start);
  }, 0);

  const computed = workDuration > 0 ? (bookedMinutes / workDuration) * 100 : 0;
  const safeBookedPercent = Math.max(
    0,
    Math.min(100, bookedPercent ?? computed)
  );

  const workHourCount = Math.max(0, Math.round(workDuration / 60));
  const safeWorkHours =
    Array.isArray(workHours) && workHours.length > 0
      ? workHours.slice(0, workHourCount)
      : null;

  return (
    <div className="booking-cal__bar">
      {safeWorkHours ? (
        safeWorkHours.map((isFree, index) => (
          <div
            key={index}
            className={
              isFree ? "booking-cal__bar-free" : "booking-cal__bar-busy"
            }
            style={{
              width: `${100 / safeWorkHours.length}%`,
            }}
          />
        ))
      ) : (
        <div
          className="booking-cal__bar-busy"
          style={{
            width: `${safeBookedPercent}%`,
          }}
        />
      )}
    </div>
  );
};
