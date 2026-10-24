import { beforeEach, describe, expect, it, vi } from "vitest";
import { BOOKING_AUTH_STORAGE_KEY, saveAuthToken } from "./authToken";
import { refreshStoredAuth } from "./refreshAuth";

function makeApi(getUserInfo: () => Promise<unknown>) {
  return { setToken: vi.fn(), getUserInfo: vi.fn(getUserInfo) } as unknown as Parameters<
    typeof refreshStoredAuth
  >[0] & { setToken: ReturnType<typeof vi.fn>; getUserInfo: ReturnType<typeof vi.fn> };
}

describe("refreshStoredAuth", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("does nothing without token", async () => {
    const api = makeApi(() => Promise.resolve({}));
    expect(await refreshStoredAuth(api)).toBe("none");
    expect(api.getUserInfo).not.toHaveBeenCalled();
  });

  it("keeps valid token", async () => {
    saveAuthToken({ token: "jwt", expiresAt: "2099-01-01T00:00:00Z", phone: "+79001234567" });
    const api = makeApi(() => Promise.resolve({ id: "c1" }));
    expect(await refreshStoredAuth(api)).toBe("valid");
    expect(api.setToken).toHaveBeenCalledWith("jwt");
    expect(localStorage.getItem(BOOKING_AUTH_STORAGE_KEY)).not.toBeNull();
  });

  it("clears token rejected by server", async () => {
    saveAuthToken({ token: "jwt", expiresAt: "2099-01-01T00:00:00Z", phone: "+79001234567" });
    const api = makeApi(() =>
      Promise.reject(Object.assign(new Error("401"), { status: 401 }))
    );
    expect(await refreshStoredAuth(api)).toBe("cleared");
    expect(localStorage.getItem(BOOKING_AUTH_STORAGE_KEY)).toBeNull();
  });

  it("keeps token on network error", async () => {
    saveAuthToken({ token: "jwt", expiresAt: "2099-01-01T00:00:00Z", phone: "+79001234567" });
    const api = makeApi(() => Promise.reject(new Error("Failed to fetch")));
    expect(await refreshStoredAuth(api)).toBe("unknown");
    expect(localStorage.getItem(BOOKING_AUTH_STORAGE_KEY)).not.toBeNull();
  });
});
