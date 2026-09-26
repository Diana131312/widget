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
  const stepId: BookingStepId =
    stepRaw && STEPS.has(stepRaw as BookingStepId)
      ? (stepRaw as BookingStepId)
      : "category";

  const catRaw = readParam(params, "cat");
  const categoryId: BookingCategoryId | null =
    catRaw && CATS.has(catRaw as BookingCategoryId)
      ? (catRaw as BookingCategoryId)
      : null;

  return {
    stepId,
    categoryId,
    roomId: readParam(params, "room"),
    checkIn: readParam(params, "in"),
    checkOut: readParam(params, "out"),
    banyaDate: readParam(params, "date"),
    banyaTimeFrom: readParam(params, "from"),
    banyaTimeTo: readParam(params, "to"),
  };
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
