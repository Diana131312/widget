import { BOOKING_ALIAS } from "../constants";
import { toApiPhone } from "./phone";

/** JWT после подтверждения номера; живёт между визитами (localStorage). */
export const BOOKING_AUTH_STORAGE_KEY = `booking-widget:${BOOKING_ALIAS}:auth:v1`;

/** По API токен живёт 5 дней — fallback, если сервер не прислал срок. */
const DEFAULT_TTL_MS = 5 * 24 * 60 * 60 * 1000;
/** Запас, чтобы не отправить токен, истекающий в момент запроса. */
const EXPIRY_SKEW_MS = 60 * 1000;

export type StoredAuthToken = {
  token: string;
  /** ISO-дата истечения */
  expiresAt: string;
  /** Номер в формате API (+7XXXXXXXXXX), для которого получен токен */
  phone: string;
  /** ФИО из последней брони — подставляем на оформлении */
  firstName?: string;
  lastName?: string;
  /** displayName из /auth или /user/info — показываем в шапке */
  displayName?: string;
};

export type AuthProfile = {
  phone: string;
  firstName: string;
  lastName: string;
  displayName: string;
};

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
    displayName?: string | null;
  },
  storage: Storage | null = defaultStorage(),
  now: number = Date.now()
): void {
  const token = args.token.trim();
  if (!token || !storage) return;
  const phone = toApiPhone(args.phone);
  // ФИО того же номера не теряем, если в этот раз его не передали
  const prev = readAuthToken(storage);
  const keep = prev?.phone === phone ? prev : null;
  const firstName = args.firstName?.trim() || keep?.firstName;
  const lastName = args.lastName?.trim() || keep?.lastName;
  const displayName = args.displayName?.trim() || keep?.displayName;
  // тот же токен без нового срока — срок не продлеваем
  const expiresAt =
    !args.expiresAt && keep?.token === token
      ? keep.expiresAt
      : parseExpiry(args.expiresAt, now);
  const value: StoredAuthToken = {
    token,
    expiresAt,
    phone,
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
    ...(displayName ? { displayName } : {}),
  };
  try {
    storage.setItem(BOOKING_AUTH_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // приватный режим / квота — просто попросим подтверждение в следующий раз
  }
}

export function clearAuthToken(storage: Storage | null = defaultStorage()): void {
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
    const o = JSON.parse(raw) as Partial<StoredAuthToken> | null;
    if (
      !o ||
      typeof o.token !== "string" ||
      typeof o.expiresAt !== "string" ||
      typeof o.phone !== "string"
    ) {
      return null;
    }
    return {
      token: o.token,
      expiresAt: o.expiresAt,
      phone: o.phone,
      ...(typeof o.firstName === "string" ? { firstName: o.firstName } : {}),
      ...(typeof o.lastName === "string" ? { lastName: o.lastName } : {}),
      ...(typeof o.displayName === "string"
        ? { displayName: o.displayName }
        : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Действующий токен для этого номера, иначе null.
 * Истёкший токен удаляется; токен другого номера не трогаем.
 */
export function getValidAuthToken(
  phone: string,
  storage: Storage | null = defaultStorage(),
  now: number = Date.now()
): string | null {
  const stored = readValidAuthToken(storage, now);
  if (!stored || stored.phone !== toApiPhone(phone)) return null;
  return stored.token;
}

/** Данные авторизованного клиента для автозаполнения, иначе null. */
export function getAuthProfile(
  storage: Storage | null = defaultStorage(),
  now: number = Date.now()
): AuthProfile | null {
  const stored = readValidAuthToken(storage, now);
  if (!stored) return null;
  return {
    phone: stored.phone,
    firstName: stored.firstName ?? "",
    lastName: stored.lastName ?? "",
    displayName: stored.displayName ?? "",
  };
}

/** Обновить displayName у сохранённого токена (ответ /user/info). */
export function saveAuthDisplayName(
  displayName: string | null | undefined,
  storage: Storage | null = defaultStorage()
): void {
  const stored = readAuthToken(storage);
  const name = displayName?.trim();
  if (!stored || !name || stored.displayName === name) return;
  try {
    storage?.setItem(
      BOOKING_AUTH_STORAGE_KEY,
      JSON.stringify({ ...stored, displayName: name })
    );
  } catch {
    // ignore
  }
}

/** Сохранённый неистёкший токен (любого номера), иначе null. */
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
