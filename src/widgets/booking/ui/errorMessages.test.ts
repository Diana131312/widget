import { describe, expect, it } from "vitest";
import { getBootstrapErrorCopy } from "./errorMessages";

describe("getBootstrapErrorCopy", () => {
  it("maps network / Failed to fetch", () => {
    expect(getBootstrapErrorCopy(new TypeError("Failed to fetch")).detail).toBe(
      "Проверьте интернет и попробуйте ещё раз"
    );
  });

  it("maps 5xx / unavailable", () => {
    const err = Object.assign(new Error("Widget API request failed: 503 Unavailable"), {
      status: 503,
    });
    expect(getBootstrapErrorCopy(err).detail).toBe(
      "Сервис временно недоступен. Попробуйте позже"
    );
  });

  it("maps timeout / AbortError", () => {
    const err = new Error("The operation was aborted");
    err.name = "AbortError";
    expect(getBootstrapErrorCopy(err).detail).toBe(
      "Слишком долгий ответ сервера"
    );
  });

  it("falls back for unknown errors", () => {
    const copy = getBootstrapErrorCopy(new Error("weird"));
    expect(copy.title).toBe("Не удалось загрузить данные");
    expect(copy.detail).toBe("Что-то пошло не так. Попробуйте ещё раз");
  });
});
