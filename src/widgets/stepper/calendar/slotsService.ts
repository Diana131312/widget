import type { Guid, LocalDate, RoomTimesResponse } from "../../../api";
import type { RoomTimeSlot } from "../../../api";

/**
 * Кеш для результатов запросов слотов
 * Ключ: "${roomId}_${date}"
 */
const slotsCache = new Map<string, RoomTimesResponse>();

/**
 * Генерирует ключ кеша
 */
function getCacheKey(roomId: string, date: LocalDate): string {
  return `${roomId}_${date}`;
}

/**
 * Загружает слоты для бани на конкретную дату
 */
export async function loadRoomTimeSlots(
  api: {
    getRoomTimes: (roomId: Guid, date: LocalDate) => Promise<RoomTimesResponse>;
  },
  roomId: string,
  date: LocalDate,
  useCache = true
): Promise<RoomTimeSlot[]> {
  const cacheKey = getCacheKey(roomId, date);

  // Проверяем кеш
  if (useCache && slotsCache.has(cacheKey)) {
    const cached = slotsCache.get(cacheKey)!;
    return extractSlots(cached);
  }

  // Делаем запрос
  const response = await api.getRoomTimes(roomId, date);

  // Сохраняем в кеш
  if (useCache) {
    slotsCache.set(cacheKey, response);
  }

  return extractSlots(response);
}

/**
 * Извлекает слоты из ответа API
 */
function extractSlots(response: RoomTimesResponse): RoomTimeSlot[] {
  // Если есть slots - используем их
  if (response.slots && Array.isArray(response.slots)) {
    return response.slots;
  }

  // Если есть times - конвертируем в slots (показываем ВСЕ, даже занятые)
  if (response.times && Array.isArray(response.times)) {
    return response.times.map((t) => {
      const time = t.time || "";
      const [hours, minutes] = time.split(":").map(Number);
      const duration = 1; // По умолчанию 1 час, если не указано
      const endHour = hours + duration;
      const timeTo = `${String(endHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

      return {
        timeFrom: time,
        timeTo,
        duration,
        price: 0, // Цена не указана в times
        comment: null,
        isAvailable: t.isFree === true,
      } as RoomTimeSlot;
    });
  }

  return [];
}

/**
 * Очищает кеш слотов (для принудительного обновления)
 */
export function clearSlotsCache(): void {
  slotsCache.clear();
}
