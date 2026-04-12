import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import type { Guid, LocalDate, AvailabilityResponse } from "../../../api";
import type { DayOccupancy, WeeklyOccupancyData, MonthlyOccupancyData } from "./types";
import type { WidgetRoom } from "../../../api";

const WORK_DAY_START_HOUR = 9;
const WORK_DAY_END_HOUR = 22; // включительно (9-22 = 14 часов)

/**
 * Кеш для результатов запросов занятости
 * Ключ: "${roomId}_${from}_${to}"
 */
const availabilityCache = new Map<string, AvailabilityResponse>();

/**
 * Генерирует ключ кеша
 */
function getCacheKey(roomId: string, from: LocalDate, to: LocalDate): string {
  return `${roomId}_${from}_${to}`;
}

/**
 * Конвертирует данные API в формат DayOccupancy
 * 
 * Правила:
 * - Учитываем только рабочие часы (9-22, индексы 9-22 включительно = 14 часов)
 * - hours[hour] === true означает свободный час
 * - hours[hour] === false означает занятый час
 * - hours[hour] === undefined/null трактуется как занятый (безопасно)
 */
export function convertAvailabilityToDayOccupancy(
  date: Date,
  dayData: { hasAvailable: boolean; hours: boolean[] } | undefined
): DayOccupancy {
  if (!dayData || !dayData.hours || !Array.isArray(dayData.hours)) {
    return { date, bookedRanges: [] };
  }

  const bookedRanges: Array<{ start: string; end: string }> = [];
  const hours = dayData.hours;

  // Проверяем, что массив hours имеет достаточную длину
  if (hours.length < WORK_DAY_END_HOUR + 1) {
    // Если массив короче, чем нужно, считаем все рабочие часы занятыми
    bookedRanges.push({
      start: `${String(WORK_DAY_START_HOUR).padStart(2, "0")}:00`,
      end: `${String(WORK_DAY_END_HOUR + 1).padStart(2, "0")}:00`,
    });
    return { date, bookedRanges };
  }

  // Обрабатываем только рабочие часы (9-22 включительно = 14 часов)
  // Индексы массива: 9, 10, 11, ..., 22 (всего 14 часов)
  let currentRangeStart: number | null = null;

  for (let hour = WORK_DAY_START_HOUR; hour <= WORK_DAY_END_HOUR; hour++) {
    // Получаем значение часа из массива
    // hours[hour] может быть: true (свободен), false (занят), undefined, null
    const hourValue = hours[hour];
    
    // Строгая проверка: только true означает свободный час
    // Все остальное (false, undefined, null) = занят
    const isFree = hourValue === true;

    if (!isFree) {
      // Час занят (false, undefined, null)
      if (currentRangeStart === null) {
        // Начинаем новый диапазон занятости
        currentRangeStart = hour;
      }
      // Продолжаем текущий диапазон (не нужно ничего делать)
    } else {
      // Час свободен (true) - закрываем текущий диапазон занятости, если он был открыт
      if (currentRangeStart !== null) {
        // Сохраняем диапазон: от currentRangeStart до hour (не включая hour, так как он свободен)
        bookedRanges.push({
          start: `${String(currentRangeStart).padStart(2, "0")}:00`,
          end: `${String(hour).padStart(2, "0")}:00`,
        });
        currentRangeStart = null;
      }
      // Если currentRangeStart === null, значит все предыдущие часы были свободны, ничего не делаем
    }
  }

  // Закрываем последний диапазон занятости, если он не закрыт
  // Это происходит, если последние рабочие часы (до WORK_DAY_END_HOUR включительно) заняты
  if (currentRangeStart !== null) {
    bookedRanges.push({
      start: `${String(currentRangeStart).padStart(2, "0")}:00`,
      end: `${String(WORK_DAY_END_HOUR + 1).padStart(2, "0")}:00`, // 23:00 (конец рабочего дня)
    });
  }

  return {
    date,
    bookedRanges,
  };
}

/**
 * Загружает занятость для одной бани за период
 */
export async function loadRoomAvailability(
  api: { getAvailability: (args: { roomId: Guid; from: LocalDate; to: LocalDate }) => Promise<AvailabilityResponse> },
  roomId: string,
  from: LocalDate,
  to: LocalDate,
  useCache = true
): Promise<AvailabilityResponse> {
  const cacheKey = getCacheKey(roomId, from, to);

  // Проверяем кеш
  if (useCache && availabilityCache.has(cacheKey)) {
    return availabilityCache.get(cacheKey)!;
  }

  // Делаем запрос
  const response = await api.getAvailability({ roomId, from, to });

  // Сохраняем в кеш
  if (useCache) {
    availabilityCache.set(cacheKey, response);
  }

  return response;
}

/**
 * Загружает занятость для всех бань за неделю
 */
export async function loadWeeklyAvailabilityForAllRooms(
  api: { getAvailability: (args: { roomId: Guid; from: LocalDate; to: LocalDate }) => Promise<AvailabilityResponse> },
  rooms: WidgetRoom[],
  weekStart: Date
): Promise<Map<string, AvailabilityResponse>> {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const from = format(weekStart, "yyyy-MM-dd");
  const to = format(weekEnd, "yyyy-MM-dd");

  // Параллельные запросы для всех бань
  const requests = rooms.map((room) =>
    loadRoomAvailability(api, room.id, from, to).then((data) => ({
      roomId: room.id,
      data,
    }))
  );

  const results = await Promise.allSettled(requests);
  const map = new Map<string, AvailabilityResponse>();

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      map.set(result.value.roomId, result.value.data);
    } else {
      // При ошибке - пустой ответ
      map.set(rooms[index].id, { days: {} });
    }
  });

  return map;
}

/**
 * Загружает занятость для одной бани за месяц
 */
export async function loadMonthlyAvailabilityForRoom(
  api: { getAvailability: (args: { roomId: Guid; from: LocalDate; to: LocalDate }) => Promise<AvailabilityResponse> },
  roomId: string,
  monthStart: Date
): Promise<AvailabilityResponse> {
  const monthEnd = endOfMonth(monthStart);
  const from = format(monthStart, "yyyy-MM-dd");
  const to = format(monthEnd, "yyyy-MM-dd");

  return loadRoomAvailability(api, roomId, from, to);
}

/**
 * Конвертирует AvailabilityResponse в WeeklyOccupancyData
 */
export function convertToWeeklyOccupancyData(
  rooms: WidgetRoom[],
  weekStart: Date,
  availabilityMap: Map<string, AvailabilityResponse>
): WeeklyOccupancyData {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekDays: Date[] = [];
  for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
    weekDays.push(new Date(d));
  }

  return rooms.map((room) => {
    const availability = availabilityMap.get(room.id);
    const days = weekDays.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayData = availability?.days?.[dateStr];
      return convertAvailabilityToDayOccupancy(day, dayData);
    });

    return {
      roomId: room.id,
      roomName: room.name,
      days,
    };
  });
}

/**
 * Конвертирует AvailabilityResponse в MonthlyOccupancyData
 */
export function convertToMonthlyOccupancyData(
  monthStart: Date,
  availability: AvailabilityResponse
): MonthlyOccupancyData {
  const monthEnd = endOfMonth(monthStart);
  const days: DayOccupancy[] = [];

  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    const dateStr = format(d, "yyyy-MM-dd");
    const dayData = availability.days?.[dateStr];
    days.push(convertAvailabilityToDayOccupancy(d, dayData));
  }

  return days;
}

/**
 * Очищает кеш (для принудительного обновления)
 */
export function clearAvailabilityCache(): void {
  availabilityCache.clear();
}
