import type { WidgetApiClient } from "../../../api";
import {
  applyUserInfo,
  clearAuthToken,
  readValidAuthToken,
} from "./authToken";

export type AuthRefreshResult = "none" | "valid" | "cleared" | "unknown";

function statusOf(err: unknown): number | null {
  return err && typeof err === "object" && "status" in err
    ? Number((err as { status: unknown }).status) || null
    : null;
}

/**
 * При заходе: проверяем сохранённый токен через GET /user/info.
 * 401/403 → токен удаляем; сеть/5xx → оставляем (проверим при брони).
 */
export async function refreshStoredAuth(
  api: Pick<WidgetApiClient, "setToken" | "getUserInfo">
): Promise<AuthRefreshResult> {
  const stored = readValidAuthToken();
  if (!stored) return "none";

  api.setToken(stored.token);
  try {
    const info = await api.getUserInfo();
    // телефон и ФИО — только в память, не в localStorage
    applyUserInfo(info);
    return "valid";
  } catch (err) {
    const status = statusOf(err);
    if (status === 401 || status === 403) {
      clearAuthToken();
      api.setToken(null);
      return "cleared";
    }
    return "unknown";
  }
}
