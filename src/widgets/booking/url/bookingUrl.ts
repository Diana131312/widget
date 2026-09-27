import type { BookingCategoryId, BookingStepId } from "../types";

const PREFIX = "bk_";

const URL_KEYS = [
  "step",
  "cat",
  "room",
  "in",
  "out",
  "date",
  "from",
  "to",
  "guests",
  "products",
] as const;

export type BookingUrlState = {
  stepId: BookingStepId;
  categoryId: BookingCategoryId | null;
  roomId: string | null;
  checkIn: string | null;
  checkOut: string | null;
  banyaDate: string | null;
  banyaTimeFrom: string | null;
  banyaTimeTo: string | null;
  guestCount: number;
  productQuantities: Record<string, number>;
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
  guestCount: 0,
  productQuantities: {},
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

/** `id:qty,id:qty` → map (qty ≥ 1). */
export function decodeProducts(raw: string | null): Record<string, number> {
  if (!raw) return {};
  const out: Record<string, number> = {};
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colon = trimmed.lastIndexOf(":");
    if (colon <= 0) continue;
    const id = trimmed.slice(0, colon).trim();
    const qty = Number.parseInt(trimmed.slice(colon + 1).trim(), 10);
    if (!id || !Number.isFinite(qty) || qty < 1) continue;
    out[id] = qty;
  }
  return out;
}

/** map → `id:qty,id:qty` (stable id order). */
export function encodeProducts(qty: Record<string, number>): string | null {
  const parts: string[] = [];
  for (const id of Object.keys(qty).sort()) {
    const n = qty[id];
    if (typeof n !== "number" || !Number.isFinite(n) || n < 1) continue;
    parts.push(`${id}:${Math.floor(n)}`);
  }
  return parts.length > 0 ? parts.join(",") : null;
}

function parseGuestCount(raw: string | null): number {
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function clearBookingParams(url: URL): void {
  for (const key of URL_KEYS) {
    url.searchParams.delete(`${PREFIX}${key}`);
  }
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
  const guestCount = parseGuestCount(readParam(params, "guests"));
  const productQuantities = decodeProducts(readParam(params, "products"));

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

  const onSetupLike =
    stepId === "setup" || stepId === "extras" || stepId === "checkout";

  return {
    stepId,
    categoryId,
    roomId,
    checkIn,
    checkOut,
    banyaDate,
    banyaTimeFrom,
    banyaTimeTo,
    guestCount: onSetupLike ? guestCount : 0,
    productQuantities: onSetupLike ? productQuantities : {},
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
  clearBookingParams(url);
  url.searchParams.set(`${PREFIX}step`, "object");
  url.searchParams.set(`${PREFIX}cat`, categoryId);
  url.searchParams.set(`${PREFIX}room`, roomId);
  return url.toString();
}

/** Запись в текущий URL через replaceState (остальные query-ключи не трогаем). */
export function writeBookingUrl(state: BookingUrlState): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  clearBookingParams(url);

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

  const onSetupLike =
    state.stepId === "setup" ||
    state.stepId === "extras" ||
    state.stepId === "checkout";
  if (onSetupLike && state.guestCount > 0) {
    url.searchParams.set(`${PREFIX}guests`, String(Math.floor(state.guestCount)));
  }
  if (onSetupLike) {
    const encoded = encodeProducts(state.productQuantities);
    if (encoded) {
      url.searchParams.set(`${PREFIX}products`, encoded);
    }
  }

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState(window.history.state, "", next);
  }
}

function productsEqual(
  a: Record<string, number>,
  b: Record<string, number>
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
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
    a.banyaTimeTo === b.banyaTimeTo &&
    a.guestCount === b.guestCount &&
    productsEqual(a.productQuantities, b.productQuantities)
  );
}
