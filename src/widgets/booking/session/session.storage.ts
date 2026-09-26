import { BOOKING_SESSION_STORAGE_KEY } from "../constants";
import { BOOKING_STEPS, type BookingStepId } from "../types";
import {
  DEFAULT_BOOKING_SESSION,
  type BookingSessionPatch,
  type BookingSessionV1,
} from "./session.types";

function isStepId(value: unknown): value is BookingStepId {
  return (
    typeof value === "string" &&
    BOOKING_STEPS.some((s) => s.id === value)
  );
}

export function readBookingSession(
  storage: Storage = sessionStorage
): BookingSessionV1 {
  try {
    const raw = storage.getItem(BOOKING_SESSION_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_BOOKING_SESSION, updatedAt: Date.now() };
    }

    const parsed = JSON.parse(raw) as Partial<BookingSessionV1>;
    if (parsed.version !== 1) {
      return { ...DEFAULT_BOOKING_SESSION, updatedAt: Date.now() };
    }

    const stepId = isStepId(parsed.stepId)
      ? parsed.stepId
      : DEFAULT_BOOKING_SESSION.stepId;

    const categoryId =
      parsed.categoryId === "homes" || parsed.categoryId === "banya"
        ? parsed.categoryId
        : null;

    return {
      version: 1,
      updatedAt:
        typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
      stepId,
      categoryId,
      roomId: typeof parsed.roomId === "string" ? parsed.roomId : null,
      checkIn: typeof parsed.checkIn === "string" ? parsed.checkIn : null,
      checkOut: typeof parsed.checkOut === "string" ? parsed.checkOut : null,
      banyaDate: typeof parsed.banyaDate === "string" ? parsed.banyaDate : null,
    };
  } catch {
    return { ...DEFAULT_BOOKING_SESSION, updatedAt: Date.now() };
  }
}

export function writeBookingSession(
  patch: BookingSessionPatch,
  storage: Storage = sessionStorage
): BookingSessionV1 {
  const current = readBookingSession(storage);
  const next: BookingSessionV1 = {
    ...current,
    ...patch,
    version: 1,
    updatedAt: Date.now(),
  };
  storage.setItem(BOOKING_SESSION_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearBookingSession(storage: Storage = sessionStorage): void {
  storage.removeItem(BOOKING_SESSION_STORAGE_KEY);
}
