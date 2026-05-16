import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns";
import type { WidgetApiClient } from "../../../api";
import type { DailyOccupiedRange } from "./dailyTypes";

function parseRangeEntry(raw: unknown): DailyOccupiedRange | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const startDate = o.startDate ?? o.start ?? o.from;
  const endDate = o.endDate ?? o.end ?? o.to;
  if (typeof startDate !== "string" || typeof endDate !== "string") return null;
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (!isValid(start) || !isValid(end)) return null;
  return { startDate, endDate };
}

export function parseDailyOccupiedResponse(data: unknown): DailyOccupiedRange[] {
  if (!Array.isArray(data)) return [];
  return data.map(parseRangeEntry).filter((r): r is DailyOccupiedRange => r != null);
}

/**
 * Ночи бронирования: startDate включительно, endDate — день выезда (не ночь).
 */
export function expandOccupiedNights(ranges: DailyOccupiedRange[]): Set<string> {
  const occupied = new Set<string>();

  for (const range of ranges) {
    const start = parseISO(range.startDate);
    const end = parseISO(range.endDate);
    if (!isValid(start) || !isValid(end)) continue;

    if (range.endDate <= range.startDate) {
      occupied.add(range.startDate);
      continue;
    }

    const lastNight = subDays(end, 1);
    if (lastNight < start) {
      occupied.add(range.startDate);
      continue;
    }

    eachDayOfInterval({ start, end: lastNight }).forEach((d) => {
      occupied.add(format(d, "yyyy-MM-dd"));
    });
  }

  return occupied;
}

export function getOccupiedFetchWindow(anchorMonth: Date): { from: string; to: string } {
  const from = format(startOfMonth(addMonths(anchorMonth, -1)), "yyyy-MM-dd");
  const to = format(endOfMonth(addMonths(anchorMonth, 1)), "yyyy-MM-dd");
  return { from, to };
}

export async function loadDailyOccupied(
  api: WidgetApiClient,
  roomId: string,
  anchorMonth: Date
): Promise<DailyOccupiedRange[]> {
  const { from, to } = getOccupiedFetchWindow(anchorMonth);
  const response = await api.getDailyOccupied({ roomId, from, to });
  return parseDailyOccupiedResponse(response);
}

export function rangeHasOccupiedNights(
  checkIn: string,
  checkOut: string,
  occupiedNights: Set<string>
): boolean {
  const start = parseISO(checkIn);
  const end = parseISO(checkOut);
  if (!isValid(start) || !isValid(end) || checkOut <= checkIn) return true;

  const nights = eachDayOfInterval({ start, end: subDays(end, 1) });
  return nights.some((d) => occupiedNights.has(format(d, "yyyy-MM-dd")));
}

export function countNights(checkIn: string, checkOut: string): number {
  const start = parseISO(checkIn);
  const end = parseISO(checkOut);
  if (!isValid(start) || !isValid(end) || checkOut <= checkIn) return 0;
  return eachDayOfInterval({ start, end: subDays(end, 1) }).length;
}
