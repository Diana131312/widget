import { parseISO, startOfMonth } from "date-fns";
import type { WidgetApiClient, WidgetGetResponse } from "../../../api";
import {
  countNights,
  expandOccupiedNights,
  loadDailyOccupied,
  loadRoomTimeSlots,
  rangeHasOccupiedNights,
} from "../calendar/services";
import {
  DEFAULT_BOOKING_URL_STATE,
  type BookingUrlState,
} from "./bookingUrl";

export type BookingUrlValidation =
  | {
      ok: true;
      state: BookingUrlState;
      /** Из matched-слота при validate бани (не в URL). */
      slotMeta?: { duration: number | null; price: number | null } | null;
    }
  | { ok: false; state: BookingUrlState; reason: string };

function homeState(state: BookingUrlState): BookingUrlState {
  return {
    ...DEFAULT_BOOKING_URL_STATE,
    stepId: "category",
  };
}

function toObjectStep(
  categoryId: BookingUrlState["categoryId"],
  roomId: string | null = null
): BookingUrlState {
  return {
    ...DEFAULT_BOOKING_URL_STATE,
    stepId: "object",
    categoryId,
    roomId,
  };
}

/**
 * Проверяет deep-link после загрузки config.
 * Невалидное → откат на category (или object, если категория ок, а детали нет).
 */
export async function validateBookingUrl(
  candidate: BookingUrlState,
  config: WidgetGetResponse,
  api: WidgetApiClient
): Promise<BookingUrlValidation> {
  const { stepId, categoryId } = candidate;

  if (stepId === "category") {
    return { ok: true, state: { ...DEFAULT_BOOKING_URL_STATE } };
  }

  if (!categoryId) {
    return {
      ok: false,
      state: homeState(candidate),
      reason: "В ссылке нет категории",
    };
  }

  if (stepId === "object") {
    const roomId = candidate.roomId;
    if (roomId) {
      const exists =
        categoryId === "homes"
          ? (config.dailyRooms ?? []).some((r) => r.id === roomId)
          : (config.rooms ?? []).some((r) => r.id === roomId);
      if (!exists) {
        return {
          ok: false,
          state: toObjectStep(categoryId),
          reason: "Объект из ссылки не найден",
        };
      }
      return {
        ok: true,
        state: {
          ...DEFAULT_BOOKING_URL_STATE,
          stepId: "object",
          categoryId,
          roomId,
        },
      };
    }
    return {
      ok: true,
      state: {
        ...DEFAULT_BOOKING_URL_STATE,
        stepId: "object",
        categoryId,
      },
    };
  }

  // setup / extras / checkout — пока валидируем как setup
  if (categoryId === "homes") {
    return validateHomeSetup(candidate, config, api);
  }
  if (categoryId === "banya") {
    return validateBanyaSetup(candidate, config, api);
  }

  return {
    ok: false,
    state: homeState(candidate),
    reason: "Неизвестная категория",
  };
}

async function validateHomeSetup(
  candidate: BookingUrlState,
  config: WidgetGetResponse,
  api: WidgetApiClient
): Promise<BookingUrlValidation> {
  const { roomId, checkIn, checkOut, categoryId } = candidate;
  if (!roomId || !checkIn || !checkOut) {
    return {
      ok: false,
      state: toObjectStep(categoryId, roomId ?? null),
      reason: "В ссылке неполный выбор дат",
    };
  }

  const room = (config.dailyRooms ?? []).find((r) => r.id === roomId);
  if (!room) {
    return {
      ok: false,
      state: toObjectStep(categoryId),
      reason: "Объект из ссылки не найден",
    };
  }

  let nights: number;
  try {
    nights = countNights(checkIn, checkOut);
  } catch {
    return {
      ok: false,
      state: toObjectStep(categoryId),
      reason: "Некорректные даты в ссылке",
    };
  }

  if (nights < 1) {
    return {
      ok: false,
      state: toObjectStep(categoryId),
      reason: "Некорректный диапазон дат",
    };
  }

  const min = room.minNights;
  const max = room.maxNights;
  if (typeof min === "number" && min > 0 && nights < min) {
    return {
      ok: false,
      state: toObjectStep(categoryId),
      reason: `Нужно минимум ${min} ноч.`,
    };
  }
  if (typeof max === "number" && max > 0 && nights > max) {
    return {
      ok: false,
      state: toObjectStep(categoryId),
      reason: `Максимум ${max} ноч.`,
    };
  }

  try {
    const month = startOfMonth(parseISO(checkIn));
    const ranges = await loadDailyOccupied(api, roomId, month);
    const occupied = expandOccupiedNights(ranges);
    if (rangeHasOccupiedNights(checkIn, checkOut, occupied)) {
      return {
        ok: false,
        state: toObjectStep(categoryId),
        reason: "Выбранные даты уже заняты",
      };
    }
  } catch {
    return {
      ok: false,
      state: toObjectStep(categoryId),
      reason: "Не удалось проверить занятость",
    };
  }

  return {
    ok: true,
    state: {
      ...DEFAULT_BOOKING_URL_STATE,
      stepId: "setup",
      categoryId: "homes",
      roomId,
      checkIn,
      checkOut,
    },
  };
}

async function validateBanyaSetup(
  candidate: BookingUrlState,
  config: WidgetGetResponse,
  api: WidgetApiClient
): Promise<BookingUrlValidation> {
  const { roomId, banyaDate, banyaTimeFrom, banyaTimeTo, categoryId } =
    candidate;

  if (!roomId || !banyaDate || !banyaTimeFrom || !banyaTimeTo) {
    return {
      ok: false,
      state: toObjectStep(categoryId, roomId ?? null),
      reason: "В ссылке неполный выбор слота",
    };
  }

  const room = (config.rooms ?? []).find((r) => r.id === roomId);
  if (!room) {
    return {
      ok: false,
      state: toObjectStep(categoryId),
      reason: "Баня из ссылки не найдена",
    };
  }

  try {
    const slots = await loadRoomTimeSlots(api, roomId, banyaDate);
    const match = slots.find(
      (s) =>
        s.timeFrom === banyaTimeFrom &&
        s.timeTo === banyaTimeTo &&
        s.isAvailable === true
    );
    if (!match) {
      return {
        ok: false,
        state: toObjectStep(categoryId),
        reason: "Выбранный слот недоступен",
      };
    }

    return {
      ok: true,
      state: {
        ...DEFAULT_BOOKING_URL_STATE,
        stepId: "setup",
        categoryId: "banya",
        roomId,
        banyaDate,
        banyaTimeFrom,
        banyaTimeTo,
      },
      slotMeta: {
        duration:
          typeof match.duration === "number" && match.duration > 0
            ? match.duration
            : null,
        price:
          typeof match.price === "number" && match.price > 0
            ? match.price
            : null,
      },
    };
  } catch {
    return {
      ok: false,
      state: toObjectStep(categoryId),
      reason: "Не удалось проверить слоты",
    };
  }
}
