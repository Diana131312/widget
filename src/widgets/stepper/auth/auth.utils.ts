export const AUTH_STORAGE_KEY = "widget.auth.session.v1";

export type StoredAuthSession = {
  token: string | null;
  userInfo: {
    id: string;
    displayName?: string | null;
    phone?: string | null;
    lastVisit?: string | null;
    visitCount?: number;
    discount?: number | null;
    discountType?: number;
    isVip?: boolean;
    deposit?: number | null;
  };
};

export function formatPhoneMask(input: string): string {
  const digits = input.replace(/\D/g, "");
  const local = digits.startsWith("7") ? digits.slice(1) : digits;
  const sliced = local.slice(0, 10);
  const parts = [
    sliced.slice(0, 3),
    sliced.slice(3, 6),
    sliced.slice(6, 8),
    sliced.slice(8, 10),
  ];

  let out = "+7";
  if (parts[0]) out += ` (${parts[0]}`;
  if (parts[0]?.length === 3) out += ")";
  if (parts[1]) out += ` ${parts[1]}`;
  if (parts[2]) out += `-${parts[2]}`;
  if (parts[3]) out += `-${parts[3]}`;
  return out;
}

export function toApiPhone(maskedPhone: string): string {
  const digits = maskedPhone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("8")) return `+7${digits.slice(1, 11)}`;
  if (digits.startsWith("7")) return `+${digits.slice(0, 11)}`;
  return `+7${digits.slice(0, 10)}`;
}

export function isPhoneMaskComplete(maskedPhone: string): boolean {
  return toApiPhone(maskedPhone).length === 12;
}

export function readAuthSession(): StoredAuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuthSession;
    if (!parsed?.userInfo?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeAuthSession(session: StoredAuthSession): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
