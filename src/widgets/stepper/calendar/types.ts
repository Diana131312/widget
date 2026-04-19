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
  bookedPercent: number; // Процент занятых часов в рабочем окне (0-100)
  workHours: boolean[]; // 15 элементов (09:00-23:00), true = свободно, false = занято
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

/** Рабочее окно (09:00 - 24:00 = 15 часов) для расчета загруженности */
export const WORK_DAY_START = "09:00";
export const WORK_DAY_END = "24:00";
export const WORK_DAY_HOURS = 15;
