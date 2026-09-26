/**
 * Реэкспорт сервисов занятости из stepper (логика без UI).
 * UI-календари живут в booking/ со своими стилями.
 */
export {
  countNights,
  expandOccupiedNights,
  loadDailyOccupied,
  rangeHasOccupiedNights,
} from "../../stepper/daily/dailyOccupiedService";

export {
  convertToMonthlyOccupancyData,
  loadMonthlyAvailabilityForRoom,
} from "../../stepper/calendar/availabilityService";

export { loadRoomTimeSlots } from "../../stepper/calendar/slotsService";

export type { MonthlyOccupancyData, DayOccupancy } from "../../stepper/calendar/types";
export { WORK_DAY_START, WORK_DAY_END } from "../../stepper/calendar/types";
