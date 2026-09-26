import { describe, expect, it } from "vitest";
import {
  formatRuPhoneMask,
  isRuPhoneComplete,
  normalizeRuPhoneDigits,
} from "./phone";

describe("phone", () => {
  it("normalizes to 7XXXXXXXXXX", () => {
    expect(normalizeRuPhoneDigits("89001234567")).toBe("79001234567");
    expect(normalizeRuPhoneDigits("+7 900 123-45-67")).toBe("79001234567");
  });

  it("formats mask", () => {
    expect(formatRuPhoneMask("79001234567")).toBe("+7 (900) 123-45-67");
  });

  it("detects complete RU phone", () => {
    expect(isRuPhoneComplete("+7 (900) 123-45-67")).toBe(true);
    expect(isRuPhoneComplete("+7 (900) 123")).toBe(false);
  });
});
