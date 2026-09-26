import { describe, expect, it } from "vitest";
import { isExtraGuestProduct } from "./isExtraGuestProduct";

describe("isExtraGuestProduct", () => {
  it("matches доп. гость variants", () => {
    expect(isExtraGuestProduct("Дополнительный гость")).toBe(true);
    expect(isExtraGuestProduct("Доп. гость")).toBe(true);
    expect(isExtraGuestProduct("Доп гости")).toBe(true);
    expect(isExtraGuestProduct("дополнительные гости")).toBe(true);
  });

  it("rejects unrelated products", () => {
    expect(isExtraGuestProduct("Веник берёзовый")).toBe(false);
    expect(isExtraGuestProduct("Подарочный набор")).toBe(false);
    expect(isExtraGuestProduct("Гостевой халат")).toBe(false);
    expect(isExtraGuestProduct("Дополнительный час")).toBe(false);
  });
});
