import { parseISO, startOfMonth } from "date-fns";
import type {
  WidgetApiClient,
  WidgetGetResponse,
  WidgetProduct,
} from "../../../api";
import {
  countNights,
  expandOccupiedNights,
  loadDailyOccupied,
  loadRoomTimeSlots,
  rangeHasOccupiedNights,
} from "../calendar/services";
import { parseHomesCalculateResponse } from "../setup/calculate.utils";
import { getMaxExtraGuests } from "../setup/extraGuestLimit";
import { groupProductsForRoom } from "../setup/groupProducts";
import { isExtraGuestProduct } from "../setup/isExtraGuestProduct";
import {
  DEFAULT_BOOKING_URL_STATE,
  type BookingUrlState,
} from "./bookingUrl";

export type BookingUrlFailureCode =
  | "missing_room"
  | "room_not_found"
  | "slot_occupied"
  | "dates_occupied"
  | "incomplete"
  | "other";

export type BookingUrlValidation =
  | {
      ok: true;
      state: BookingUrlState;
      /** Из matched-слота / расчёта (не всё в URL). */
      slotMeta?: {
        duration: number | null;
        price: number | null;
        /** Явная база для checkout, если нет slot price. */
        basePrice?: number | null;
      } | null;
    }
  | {
      ok: false;
      state: BookingUrlState;
      reason: string;
      code: BookingUrlFailureCode;
    };

function homeState(): BookingUrlState {
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

function setupStepId(candidate: BookingUrlState): BookingUrlState["stepId"] {
  if (
    candidate.stepId === "checkout" ||
    candidate.stepId === "verify" ||
    candidate.stepId === "done"
  ) {
    // verify/done без контакта в URL всегда открываем как checkout
    return "checkout";
  }
  return "setup";
}

/** Clamp гостей и qty товаров под комнату/каталог. */
export function sanitizeSetupExtras(
  candidate: BookingUrlState,
  config: WidgetGetResponse,
  capacity: number
): Pick<BookingUrlState, "guestCount" | "productQuantities"> {
  const maxGuests = Math.max(0, capacity);
  const guestCount = Math.min(
    Math.max(0, Math.floor(candidate.guestCount || 0)),
    maxGuests
  );

  if (!candidate.roomId || !candidate.categoryId) {
    return { guestCount: 0, productQuantities: {} };
  }

  const catalog = groupProductsForRoom(
    config,
    candidate.categoryId,
    candidate.roomId
  );
  const maxExtra = getMaxExtraGuests(guestCount, maxGuests);
  const productQuantities: Record<string, number> = {};

  for (const [id, qtyRaw] of Object.entries(candidate.productQuantities ?? {})) {
    const product: WidgetProduct | undefined = catalog.productsById.get(id);
    if (!product) continue;
    let qty = Math.floor(qtyRaw);
    if (!Number.isFinite(qty) || qty < 1) continue;

    if (isExtraGuestProduct(product.name)) {
      if (maxExtra <= 0) continue;
      qty = Math.min(qty, maxExtra);
    } else {
      qty = Math.min(qty, 99);
    }
    if (qty >= 1) productQuantities[id] = qty;
  }

  return { guestCount, productQuantities };
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
      state: homeState(),
      reason: "В ссылке нет категории",
      code: "other",
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
          state: homeState(),
          reason: "Объект из ссылки не найден",
          code: "room_not_found",
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

  // setup / extras / checkout
  if (categoryId === "homes") {
    return validateHomeSetup(candidate, config, api);
  }
  if (categoryId === "banya") {
    return validateBanyaSetup(candidate, config, api);
  }

  return {
    ok: false,
    state: homeState(),
    reason: "Неизвестная категория",
    code: "other",
  };
}

async function validateHomeSetup(
  candidate: BookingUrlState,
  config: WidgetGetResponse,
  api: WidgetApiClient
): Promise<BookingUrlValidation> {
  const { roomId, checkIn, checkOut, categoryId } = candidate;

  if (!roomId) {
    return {
      ok: false,
      state: homeState(),
      reason: "В ссылке нет объекта",
      code: "missing_room",
    };
  }

  if (!checkIn || !checkOut) {
    return {
      ok: false,
      state: toObjectStep(categoryId, roomId),
      reason: "В ссылке неполный выбор дат",
      code: "incomplete",
    };
  }

  const room = (config.dailyRooms ?? []).find((r) => r.id === roomId);
  if (!room) {
    return {
      ok: false,
      state: homeState(),
      reason: "Объект из ссылки не найден",
      code: "room_not_found",
    };
  }

  let nights: number;
  try {
    nights = countNights(checkIn, checkOut);
  } catch {
    return {
      ok: false,
      state: toObjectStep(categoryId, roomId),
      reason: "Некорректные даты в ссылке",
      code: "incomplete",
    };
  }

  if (nights < 1) {
    return {
      ok: false,
      state: toObjectStep(categoryId, roomId),
      reason: "Некорректный диапазон дат",
      code: "incomplete",
    };
  }

  const min = room.minNights;
  const max = room.maxNights;
  if (typeof min === "number" && min > 0 && nights < min) {
    return {
      ok: false,
      state: toObjectStep(categoryId, roomId),
      reason: `Нужно минимум ${min} ноч.`,
      code: "incomplete",
    };
  }
  if (typeof max === "number" && max > 0 && nights > max) {
    return {
      ok: false,
      state: toObjectStep(categoryId, roomId),
      reason: `Максимум ${max} ноч.`,
      code: "incomplete",
    };
  }

  try {
    const month = startOfMonth(parseISO(checkIn));
    const ranges = await loadDailyOccupied(api, roomId, month);
    const occupied = expandOccupiedNights(ranges);
    if (rangeHasOccupiedNights(checkIn, checkOut, occupied)) {
      return {
        ok: false,
        state: toObjectStep(categoryId, roomId),
        reason: "Данные даты уже заняты",
        code: "dates_occupied",
      };
    }
  } catch {
    return {
      ok: false,
      state: toObjectStep(categoryId, roomId),
      reason: "Не удалось проверить занятость",
      code: "other",
    };
  }

  const extras = sanitizeSetupExtras(
    candidate,
    config,
    room.maxCapacity ?? room.capacity ?? 10
  );

  let basePrice: number | null = null;
  if (extras.guestCount >= 1) {
    try {
      const res = await api.dailyCalculate({
        roomId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        personCount: extras.guestCount,
      });
      const view = parseHomesCalculateResponse(res);
      if (view.total > 0) basePrice = view.total;
    } catch {
      // цена восстановится на setup, если checkout без базы
    }
  }

  const wantCheckout =
    candidate.stepId === "checkout" ||
    candidate.stepId === "verify" ||
    candidate.stepId === "done";
  const stepId =
    wantCheckout && basePrice != null && basePrice > 0 && extras.guestCount >= 1
      ? "checkout"
      : wantCheckout
        ? "setup"
        : setupStepId(candidate);

  return {
    ok: true,
    state: {
      ...DEFAULT_BOOKING_URL_STATE,
      stepId,
      categoryId: "homes",
      roomId,
      checkIn,
      checkOut,
      guestCount: extras.guestCount,
      productQuantities: extras.productQuantities,
    },
    slotMeta: {
      duration: null,
      price: basePrice,
      basePrice,
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

  if (!roomId) {
    return {
      ok: false,
      state: homeState(),
      reason: "В ссылке нет объекта",
      code: "missing_room",
    };
  }

  if (!banyaDate || !banyaTimeFrom || !banyaTimeTo) {
    return {
      ok: false,
      state: toObjectStep(categoryId, roomId),
      reason: "В ссылке неполный выбор слота",
      code: "incomplete",
    };
  }

  const room = (config.rooms ?? []).find((r) => r.id === roomId);
  if (!room) {
    return {
      ok: false,
      state: homeState(),
      reason: "Баня из ссылки не найдена",
      code: "room_not_found",
    };
  }

  try {
    const slots = await loadRoomTimeSlots(api, roomId, banyaDate);
    const sameWindow = slots.find(
      (s) => s.timeFrom === banyaTimeFrom && s.timeTo === banyaTimeTo
    );
    const match =
      sameWindow && sameWindow.isAvailable === true ? sameWindow : null;

    if (!match) {
      return {
        ok: false,
        state: toObjectStep(categoryId, roomId),
        reason: "Данный слот времени уже занят",
        code: "slot_occupied",
      };
    }

    const extras = sanitizeSetupExtras(
      candidate,
      config,
      room.maxCapacity ?? room.capacity ?? 10
    );

    const slotPrice =
      typeof match.price === "number" && match.price > 0 ? match.price : null;
    const wantCheckout =
      candidate.stepId === "checkout" ||
      candidate.stepId === "verify" ||
      candidate.stepId === "done";
    const canCheckout =
      wantCheckout &&
      slotPrice != null &&
      slotPrice > 0 &&
      extras.guestCount >= 1;

    return {
      ok: true,
      state: {
        ...DEFAULT_BOOKING_URL_STATE,
        stepId: canCheckout ? "checkout" : "setup",
        categoryId: "banya",
        roomId,
        banyaDate,
        banyaTimeFrom,
        banyaTimeTo,
        guestCount: extras.guestCount,
        productQuantities: extras.productQuantities,
      },
      slotMeta: {
        duration:
          typeof match.duration === "number" && match.duration > 0
            ? match.duration
            : null,
        price: slotPrice,
        basePrice: slotPrice,
      },
    };
  } catch {
    return {
      ok: false,
      state: toObjectStep(categoryId, roomId),
      reason: "Не удалось проверить слоты",
      code: "other",
    };
  }
}
