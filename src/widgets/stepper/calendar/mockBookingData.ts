import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addWeeks,
  addMonths,
} from "date-fns";
import type { WidgetRoom } from "../../../api";
import type {
  TimeRange,
  DayOccupancy,
  RoomOccupancy,
  WeeklyOccupancyData,
  MonthlyOccupancyData,
} from "./types";
import { WORK_DAY_START, WORK_DAY_END } from "./types";

/**
 * Преобразует время "HH:mm" в минуты от начала дня
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Преобразует минуты от начала дня в время "HH:mm"
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Генерирует случайный занятый слот (1-4 часа) в пределах рабочего дня
 */
function generateRandomSlot(): TimeRange | null {
  const startMinutes = timeToMinutes(WORK_DAY_START);
  const endMinutes = timeToMinutes(WORK_DAY_END);
  const workDuration = endMinutes - startMinutes;

  // Случайная длина слота: 1-4 часа (60-240 минут)
  const slotDuration = 60 + Math.floor(Math.random() * 4) * 60;
  if (slotDuration > workDuration) return null;

  // Случайное начало слота
  const maxStart = endMinutes - slotDuration;
  const slotStart = startMinutes + Math.floor(Math.random() * (maxStart - startMinutes + 1));

  return {
    start: minutesToTime(slotStart),
    end: minutesToTime(slotStart + slotDuration),
  };
}

/**
 * Генерирует занятость для одного дня
 */
function generateDayOccupancy(date: Date): DayOccupancy {
  const bookedRanges: TimeRange[] = [];
  const slotCount = Math.floor(Math.random() * 4); // 0-3 слота

  for (let i = 0; i < slotCount; i++) {
    const slot = generateRandomSlot();
    if (slot) {
      // Проверяем пересечения (упрощенно - просто добавляем, если не пересекается)
      const overlaps = bookedRanges.some(
        (existing) =>
          (timeToMinutes(slot.start) >= timeToMinutes(existing.start) &&
            timeToMinutes(slot.start) < timeToMinutes(existing.end)) ||
          (timeToMinutes(slot.end) > timeToMinutes(existing.start) &&
            timeToMinutes(slot.end) <= timeToMinutes(existing.end))
      );

      if (!overlaps) {
        bookedRanges.push(slot);
      }
    }
  }

  // Сортируем по времени начала
  bookedRanges.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

  return {
    date,
    bookedRanges,
  };
}

/**
 * Генерирует занятость для всех бань на неделю (режим "Все бани")
 */
export function generateMockWeeklyData(
  rooms: WidgetRoom[],
  weekStart: Date
): WeeklyOccupancyData {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 }); // Понедельник = начало недели
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return rooms.map((room) => ({
    roomId: room.id,
    roomName: room.name,
    days: weekDays.map((day) => generateDayOccupancy(day)),
  }));
}

/**
 * Генерирует занятость для одной бани на месяц (режим "Конкретная баня")
 */
export function generateMockMonthlyData(
  room: WidgetRoom,
  monthStart: Date
): MonthlyOccupancyData {
  const monthEnd = endOfMonth(monthStart);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return monthDays.map((day) => generateDayOccupancy(day));
}
