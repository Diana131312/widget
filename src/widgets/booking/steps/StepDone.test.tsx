import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveAuthToken } from "../checkout/authToken";
import type { BookingResultDraft } from "../checkout/checkoutDraft";
import { StepDone } from "./StepDone";

const cancelBooking = vi.hoisted(() => vi.fn());
const setToken = vi.hoisted(() => vi.fn());
const applyCertificatePayment = vi.hoisted(() => vi.fn());

vi.mock("../../../api", () => ({
  createWidgetApi: () => ({ cancelBooking, setToken }),
}));

vi.mock("../checkout/bookingPay", () => ({
  applyCertificatePayment,
}));

const PHONE = "+7 (900) 123-45-67";

const result: BookingResultDraft = {
  bookingId: "bk1",
  price: 5000,
  prepayment: 3500,
  paymentLink: "https://pay.example/x",
  timeoutMinutes: 30,
  message: "Заезд с 14:00",
  totalFallback: 5000,
};

function renderDone(
  overrides: Partial<BookingResultDraft> = {},
  props: { onBackToCart?: () => void; onStartOver?: () => void } = {}
) {
  return render(
    <StepDone
      result={{ ...result, ...overrides }}
      contactPhone={PHONE}
      onStartOver={props.onStartOver ?? vi.fn()}
      onBackToCart={props.onBackToCart ?? vi.fn()}
    />
  );
}

describe("StepDone", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
    cancelBooking.mockReset();
    setToken.mockReset();
    applyCertificatePayment.mockReset();
    cancelBooking.mockResolvedValue({ success: true });
    saveAuthToken({
      token: "jwt",
      expiresAt: "2099-01-01T00:00:00Z",
      phone: PHONE,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows temporary booking with countdown, pay button and guest rules", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    renderDone();

    expect(screen.getByText("Бронь ждёт оплаты")).toBeInTheDocument();
    expect(screen.getByText(/Если не оплатить, она отменится через/)).toBeInTheDocument();
    expect(screen.getByText("30:00")).toBeInTheDocument();
    expect(screen.getByText("Правила для гостей")).toBeInTheDocument();
    expect(screen.getByText("Заезд с 14:00")).toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Оплатить 3[\s ]?500 ₽/ }));
    expect(openSpy).toHaveBeenCalledWith(
      "https://pay.example/x",
      "_blank",
      "noopener,noreferrer"
    );
    openSpy.mockRestore();
  });

  it("counts down and shows expired state", () => {
    const onBackToCart = vi.fn();
    renderDone({ timeoutMinutes: 1 }, { onBackToCart });

    expect(screen.getByText("01:00")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("00:59")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText("Время на оплату истекло")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Оплатить/ })).not.toBeInTheDocument();
    screen.getByRole("button", { name: "Вернуться в корзину" }).click();
    expect(onBackToCart).toHaveBeenCalled();
  });

  it("cancels booking with token and returns to cart", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onBackToCart = vi.fn();
    renderDone({}, { onBackToCart });

    await user.click(
      screen.getByRole("button", { name: "Отменить бронь и вернуться в корзину" })
    );

    await waitFor(() => expect(onBackToCart).toHaveBeenCalled());
    expect(setToken).toHaveBeenCalledWith("jwt");
    expect(cancelBooking).toHaveBeenCalledWith("bk1", { confirmed: true });
  });

  it("stays on step and shows error when cancel fails", async () => {
    cancelBooking.mockRejectedValueOnce(new Error("Сервер недоступен"));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onBackToCart = vi.fn();
    renderDone({}, { onBackToCart });

    await user.click(
      screen.getByRole("button", { name: "Отменить бронь и вернуться в корзину" })
    );

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(onBackToCart).not.toHaveBeenCalled();
    expect(screen.getByText("Бронь ждёт оплаты")).toBeInTheDocument();
  });

  it("hides cancel button without saved token", () => {
    localStorage.clear();
    renderDone();
    expect(
      screen.queryByRole("button", { name: /Отменить бронь/ })
    ).not.toBeInTheDocument();
  });

  it("shows the certificate success text only when the order is fully covered", () => {
    renderDone({
      paymentLink: null,
      paidByCertificate: true,
      certificatePaidFully: true,
    });
    expect(
      screen.getByText("Заказ был успешно оплачен сертификатом")
    ).toBeInTheDocument();
  });

  it("applies a certificate on the payment step", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    applyCertificatePayment.mockResolvedValueOnce({
      ...result,
      paymentLink: null,
      prepayment: 0,
      paidByCertificate: true,
      certificatePaidFully: true,
    });
    renderDone();

    await user.type(
      screen.getByLabelText("Оплатить подарочным сертификатом"),
      "548371"
    );
    await user.click(screen.getByRole("button", { name: "Применить" }));

    await waitFor(() => {
      expect(
        screen.getByText("Заказ был успешно оплачен сертификатом")
      ).toBeInTheDocument();
    });
    expect(applyCertificatePayment).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: "bk1" }),
      "548371"
    );
    expect(screen.queryByRole("button", { name: /Оплатить/ })).not.toBeInTheDocument();
  });

  it("keeps the pay button with the remainder when the certificate is partial", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    applyCertificatePayment.mockResolvedValueOnce({
      ...result,
      paymentLink: "https://pay.example/rest",
      prepayment: 2500,
      paidByCertificate: true,
      certificatePaidFully: false,
    });
    renderDone();

    await user.type(
      screen.getByLabelText("Оплатить подарочным сертификатом"),
      "548371"
    );
    await user.click(screen.getByRole("button", { name: "Применить" }));

    expect(
      await screen.findByRole("button", { name: /Оплатить 2[\s\u00a0]?500 ₽/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Заказ был успешно оплачен сертификатом")
    ).not.toBeInTheDocument();
  });

  it("without payment link shows plain confirmation", () => {
    renderDone({ paymentLink: null });
    expect(screen.getByText("Бронь создана")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "К началу" })).toBeInTheDocument();
    expect(screen.getByText("Правила для гостей")).toBeInTheDocument();
  });
});
