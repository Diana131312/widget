import type { BookingCategoryId, BookingStepId } from "../types";

const PREFIX = "bk_";

export type BookingUrlState = {
  stepId: BookingStepId;
  categoryId: BookingCategoryId | null;
  roomId: string | null;
  checkIn: string | null;
  checkOut: string | null;
  banyaDate: string | null;
  banyaTimeFrom: string | null;
  banyaTimeTo: string | null;
};

export const DEFAULT_BOOKING_URL_STATE: BookingUrlState = {
  stepId: "category",
  categoryId: null,
  roomId: null,
  checkIn: null,
  checkOut: null,
  banyaDate: null,
  banyaTimeFrom: null,
  banyaTimeTo: null,
};

const STEPS = new Set<BookingStepId>([
  "category",
  "object",
  "setup",
  "extras",
  "checkout",
]);

const CATS = new Set<BookingCategoryId>(["homes", "banya"]);

function readParam(params: URLSearchParams, key: string): string | null {
  const v = params.get(`${PREFIX}${key}`);
  if (v == null || v.trim() === "") return null;
  return v.trim();
}

/** Разбор query (?bk_step=…&bk_cat=…). */
export function parseBookingUrl(
  search: string = typeof window !== "undefined" ? window.location.search : ""
): BookingUrlState {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );

  const stepRaw = readParam(params, "step");
  let stepId: BookingStepId =
    stepRaw && STEPS.has(stepRaw as BookingStepId)
      ? (stepRaw as BookingStepId)
      : "category";

  const catRaw = readParam(params, "cat");
  const categoryId: BookingCategoryId | null =
    catRaw && CATS.has(catRaw as BookingCategoryId)
      ? (catRaw as BookingCategoryId)
      : null;

  const roomId = readParam(params, "room");
  const checkIn = readParam(params, "in");
  const checkOut = readParam(params, "out");
  const banyaDate = readParam(params, "date");
  const banyaTimeFrom = readParam(params, "from");
  const banyaTimeTo = readParam(params, "to");

  // Ссылка с id объекта без полного setup → шаг выбора объекта (фокус на одну карточку)
  const hasSetupDates =
    Boolean(checkIn && checkOut) ||
    Boolean(banyaDate && banyaTimeFrom && banyaTimeTo);
  if (
    roomId &&
    categoryId &&
    !hasSetupDates &&
    (stepId === "category" || stepId === "object")
  ) {
    stepId = "object";
  }

  return {
    stepId,
    categoryId,
    roomId,
    checkIn,
    checkOut,
    banyaDate,
    banyaTimeFrom,
    banyaTimeTo,
  };
}

/** Абсолютная ссылка на шаг object с фокусом на один объект. */
export function buildObjectFocusUrl(
  categoryId: BookingCategoryId,
  roomId: string
): string {
  if (typeof window === "undefined") {
    return `?bk_step=object&bk_cat=${categoryId}&bk_room=${encodeURIComponent(roomId)}`;
  }
  const url = new URL(window.location.href);
  const keys = [
    "step",
    "cat",
    "room",
    "in",
    "out",
    "date",
    "from",
    "to",
  ] as const;
  for (const key of keys) {
    url.searchParams.delete(`${PREFIX}${key}`);
  }
  url.searchParams.set(`${PREFIX}step`, "object");
  url.searchParams.set(`${PREFIX}cat`, categoryId);
  url.searchParams.set(`${PREFIX}room`, roomId);
  return url.toString();
}

/** Запись в текущий URL через replaceState (остальные query-ключи не трогаем). */
export function writeBookingUrl(state: BookingUrlState): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const keys = [
    "step",
    "cat",
    "room",
    "in",
    "out",
    "date",
    "from",
    "to",
  ] as const;

  for (const key of keys) {
    url.searchParams.delete(`${PREFIX}${key}`);
  }

  url.searchParams.set(`${PREFIX}step`, state.stepId);

  if (state.categoryId) {
    url.searchParams.set(`${PREFIX}cat`, state.categoryId);
  }
  if (state.roomId) {
    url.searchParams.set(`${PREFIX}room`, state.roomId);
  }
  if (state.checkIn) {
    url.searchParams.set(`${PREFIX}in`, state.checkIn);
  }
  if (state.checkOut) {
    url.searchParams.set(`${PREFIX}out`, state.checkOut);
  }
  if (state.banyaDate) {
    url.searchParams.set(`${PREFIX}date`, state.banyaDate);
  }
  if (state.banyaTimeFrom) {
    url.searchParams.set(`${PREFIX}from`, state.banyaTimeFrom);
  }
  if (state.banyaTimeTo) {
    url.searchParams.set(`${PREFIX}to`, state.banyaTimeTo);
  }

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState(window.history.state, "", next);
  }
}

export function bookingUrlStateEquals(
  a: BookingUrlState,
  b: BookingUrlState
): boolean {
  return (
    a.stepId === b.stepId &&
    a.categoryId === b.categoryId &&
    a.roomId === b.roomId &&
    a.checkIn === b.checkIn &&
    a.checkOut === b.checkOut &&
    a.banyaDate === b.banyaDate &&
    a.banyaTimeFrom === b.banyaTimeFrom &&
    a.banyaTimeTo === b.banyaTimeTo
  );
}
