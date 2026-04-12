import type { WidgetRoom } from "../../../api";

/** Временной диапазон (например, 9:00-12:00) */
export type TimeRange = {
  start: string; // HH:mm (например "09:00")
  end: string; // HH:mm (например "12:00")
};

/** Данные занятости для одного дня */
export type DayOccupancy = {
  date: Date;
  bookedRanges: TimeRange[]; // Занятые слоты
};

/** Данные занятости для одной бани на период */
export type RoomOccupancy = {
  roomId: string;
  roomName: string;
  days: DayOccupancy[];
};

/** Данные занятости для всех бань (недельный режим) */
export type WeeklyOccupancyData = RoomOccupancy[];

/** Данные занятости для одной бани (месячный режим) */
export type MonthlyOccupancyData = DayOccupancy[];

/** Рабочие часы (9:00 - 23:00 = 14 часов) */
export const WORK_DAY_START = "09:00";
export const WORK_DAY_END = "23:00";
export const WORK_DAY_HOURS = 14;
