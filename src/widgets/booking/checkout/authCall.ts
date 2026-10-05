import { BOOKING_ALIAS } from "../constants";

const WIDGET_API_BASE = "https://app.gettime.online/api/widget";

export type AuthCallStartResponse = {
  /** Номер, на который нужно позвонить */
  dialNumber: string;
  raw: unknown;
};

export type AuthCallPollResponse = {
  confirmed: boolean;
  raw: unknown;
};

function readString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

async function postJson(path: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${WIDGET_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(
      `Widget API request failed: ${res.status} ${res.statusText}`
    ) as Error & { status: number; body: unknown };
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

/** POST /auth/call/start — номер для звонка подтверждения. */
export async function startAuthCall(
  number: string,
  alias: string = BOOKING_ALIAS
): Promise<AuthCallStartResponse> {
  const raw = await postJson("/auth/call/start", { alias, number });
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const dialNumber =
    readString(o, [
      "number",
      "phone",
      "phoneNumber",
      "callNumber",
      "dialNumber",
      "to",
    ]) ?? "";
  return { dialNumber, raw };
}

/** POST /auth/call/poll — подтверждён ли звонок. */
export async function pollAuthCall(
  number: string,
  alias: string = BOOKING_ALIAS
): Promise<AuthCallPollResponse> {
  const raw = await postJson("/auth/call/poll", { alias, number });
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const confirmed =
    o.confirmed === true ||
    o.Confirmed === true ||
    o.success === true ||
    o.isConfirmed === true;
  return { confirmed, raw };
}
