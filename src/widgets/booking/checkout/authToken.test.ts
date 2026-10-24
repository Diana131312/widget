import { beforeEach, describe, expect, it } from "vitest";
import {
  BOOKING_AUTH_STORAGE_KEY,
  clearAuthToken,
  getAuthProfile,
  getValidAuthToken,
  readTokenFromResponse,
  saveAuthToken,
} from "./authToken";

const NOW = Date.parse("2026-10-24T12:00:00Z");

describe("authToken", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns token for the same phone in any format", () => {
    saveAuthToken(
      { token: "jwt", expiresAt: "2026-10-29T12:00:00Z", phone: "+7 (900) 123-45-67" },
      localStorage,
      NOW
    );
    expect(getValidAuthToken("+79001234567", localStorage, NOW)).toBe("jwt");
    expect(getValidAuthToken("+7 (911) 000-00-00", localStorage, NOW)).toBeNull();
  });

  it("drops expired token", () => {
    saveAuthToken(
      { token: "jwt", expiresAt: "2026-10-24T12:00:30Z", phone: "+79001234567" },
      localStorage,
      NOW
    );
    expect(getValidAuthToken("+79001234567", localStorage, NOW)).toBeNull();
    expect(localStorage.getItem(BOOKING_AUTH_STORAGE_KEY)).toBeNull();
  });

  it("falls back to 5 days when expiry is missing", () => {
    saveAuthToken({ token: "jwt", phone: "+79001234567" }, localStorage, NOW);
    const day = 24 * 60 * 60 * 1000;
    expect(getValidAuthToken("+79001234567", localStorage, NOW + 4 * day)).toBe("jwt");
    expect(getValidAuthToken("+79001234567", localStorage, NOW + 5 * day)).toBeNull();
  });

  it("ignores corrupted storage and clears", () => {
    localStorage.setItem(BOOKING_AUTH_STORAGE_KEY, "{oops");
    expect(getValidAuthToken("+79001234567", localStorage, NOW)).toBeNull();
    saveAuthToken({ token: "jwt", phone: "+79001234567" }, localStorage, NOW);
    clearAuthToken(localStorage);
    expect(localStorage.getItem(BOOKING_AUTH_STORAGE_KEY)).toBeNull();
  });

  it("keeps name for same phone and does not extend expiry of same token", () => {
    saveAuthToken(
      {
        token: "jwt",
        expiresAt: "2026-10-25T12:00:00Z",
        phone: "+79001234567",
        firstName: "Иван",
        lastName: "Петров",
      },
      localStorage,
      NOW
    );
    saveAuthToken({ token: "jwt", phone: "+7 (900) 123-45-67" }, localStorage, NOW);
    expect(getAuthProfile(localStorage, NOW)).toEqual({
      phone: "+79001234567",
      firstName: "Иван",
      lastName: "Петров",
      displayName: "",
    });
    const day = 24 * 60 * 60 * 1000;
    expect(getAuthProfile(localStorage, NOW + 2 * day)).toBeNull();
  });

  it("reads token from save response", () => {
    expect(readTokenFromResponse({ token: "t", tokenExpiresAt: "x" })).toEqual({
      token: "t",
      expiresAt: "x",
    });
    expect(readTokenFromResponse({ bookingId: "1" })).toBeNull();
    expect(readTokenFromResponse(null)).toBeNull();
  });
});
