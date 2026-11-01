import { BOOKING_ALIAS } from "../constants";
import { toApiPhone } from "./phone";

/**
 * JWT после подтверждения номера; живёт между визитами (localStorage).
 * Храним только токен и срок — персональные данные (телефон, ФИО)
 * в localStorage не пишем, берём из GET /user/info.
 */
export const BOOKING_AUTH_STORAGE_KEY = `booking-widget:${BOOKING_ALIAS}:auth:v1`;

/** По API токен живёт 5 дней — fallback, если сервер не прислал срок. */
const DEFAULT_TTL_MS = 5 * 24 * 60 * 60 * 1000;
/** Запас, чтобы не отправить токен, истекающий в момент запроса. */
const EXPIRY_SKEW_MS = 60 * 1000;

export type StoredAuthToken = {
  token: string;
  /** ISO-дата истечения */
  expiresAt: string;
};

export type AuthProfile = {
  /** Номер в формате API (+7XXXXXXXXXX), для которого получен токен */
  phone: string;
  firstName: string;
  lastName: string;
};

/**
 * Профиль владельца токена — только в памяти вкладки.
 * Источник: /user/info при заходе; до ответа — данные только что
 * подтверждённого номера из формы. Привязан к токену: сменился — не наш.
 */
let sessionProfile: (AuthProfile & { token: string }) | null = null;

function defaultStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function parseExpiry(expiresAt: string | null | undefined, now: number): string {
  const ms = expiresAt ? Date.parse(expiresAt) : NaN;
  return new Date(Number.isFinite(ms) ? ms : now + DEFAULT_TTL_MS).toISOString();
}

export function saveAuthToken(
  args: {
    token: string;
    expiresAt?: string | null;
    phone: string;
    firstName?: string;
    lastName?: string;
  },
  storage: Storage | null = defaultStorage(),
  now: number = Date.now()
): void {
  const token = args.token.trim();
  if (!token || !storage) return;
  const phone = toApiPhone(args.phone);
  const prev = readAuthToken(storage);
  // тот же токен без нового срока — срок не продлеваем
  const expiresAt =
    !args.expiresAt && prev?.token === token
      ? prev.expiresAt
      : parseExpiry(args.expiresAt, now);

  // ФИО того же номера не теряем, если в этот раз его не передали
  const keep =
    sessionProfile && sessionProfile.phone === phone ? sessionProfile : null;
  sessionProfile = {
    token,
    phone,
    firstName: args.firstName?.trim() || keep?.firstName || "",
    lastName: args.lastName?.trim() || keep?.lastName || "",
  };

  const value: StoredAuthToken = { token, expiresAt };
  try {
    storage.setItem(BOOKING_AUTH_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // приватный режим / квота — просто попросим подтверждение в следующий раз
  }
}

export function clearAuthToken(storage: Storage | null = defaultStorage()): void {
  sessionProfile = null;
  try {
    storage?.removeItem(BOOKING_AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function readAuthToken(storage: Storage | null): StoredAuthToken | null {
  try {
    const raw = storage?.getItem(BOOKING_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown> | null;
    if (!o || typeof o.token !== "string" || typeof o.expiresAt !== "string") {
      return null;
    }
    const value: StoredAuthToken = { token: o.token, expiresAt: o.expiresAt };
    // старый формат хранил телефон и ФИО — вычищаем
    if (Object.keys(o).some((k) => k !== "token" && k !== "expiresAt")) {
      try {
        storage?.setItem(BOOKING_AUTH_STORAGE_KEY, JSON.stringify(value));
      } catch {
        // ignore
      }
    }
    return value;
  } catch {
    return null;
  }
}

/** Профиль владельца текущего токена (из памяти), иначе null. */
function profileFor(stored: StoredAuthToken | null): AuthProfile | null {
  if (!stored || !sessionProfile || sessionProfile.token !== stored.token) {
    return null;
  }
  const { phone, firstName, lastName } = sessionProfile;
  return { phone, firstName, lastName };
}

/**
 * Действующий токен для этого номера, иначе null.
 * Номер владельца токена известен из /user/info (или из подтверждения);
 * пока он неизвестен — токен не используем. Истёкший токен удаляется.
 */
export function getValidAuthToken(
  phone: string,
  storage: Storage | null = defaultStorage(),
  now: number = Date.now()
): string | null {
  const stored = readValidAuthToken(storage, now);
  const profile = profileFor(stored);
  if (!stored || !profile || profile.phone !== toApiPhone(phone)) return null;
  return stored.token;
}

/** Данные авторизованного клиента для автозаполнения, иначе null. */
export function getAuthProfile(
  storage: Storage | null = defaultStorage(),
  now: number = Date.now()
): AuthProfile | null {
  return profileFor(readValidAuthToken(storage, now));
}

/** Профиль из ответа GET /user/info (name, lastName, phone) — только в память. */
export function applyUserInfo(
  info: unknown,
  storage: Storage | null = defaultStorage()
): void {
  const stored = readAuthToken(storage);
  if (!stored || !info || typeof info !== "object") return;
  const o = info as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const phone = str(o.phone);
  if (!phone) return;
  sessionProfile = {
    token: stored.token,
    phone: toApiPhone(phone),
    firstName: str(o.name),
    lastName: str(o.lastName),
  };
}

/** Сохранённый неистёкший токен, иначе null. */
export function readValidAuthToken(
  storage: Storage | null = defaultStorage(),
  now: number = Date.now()
): StoredAuthToken | null {
  const stored = readAuthToken(storage);
  if (!stored) return null;
  const expiresMs = Date.parse(stored.expiresAt);
  if (!Number.isFinite(expiresMs) || expiresMs - EXPIRY_SKEW_MS <= now) {
    clearAuthToken(storage);
    return null;
  }
  return stored;
}

/** Токен из ответа /save, /daily-save или /auth/call/poll (если сервер его прислал). */
export function readTokenFromResponse(
  res: unknown
): { token: string; expiresAt: string | null } | null {
  if (!res || typeof res !== "object") return null;
  const o = res as Record<string, unknown>;
  const token = typeof o.token === "string" ? o.token.trim() : "";
  if (!token) return null;
  const exp = o.tokenExpiresAt ?? o.expiresAt;
  return { token, expiresAt: typeof exp === "string" ? exp : null };
}
