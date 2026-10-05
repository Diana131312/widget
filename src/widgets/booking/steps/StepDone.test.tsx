import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StepDone } from "./StepDone";

describe("StepDone", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not auto-open payment; opens only on button click", async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    });
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const onStartOver = vi.fn();

    render(
      <StepDone
        result={{
          bookingId: "bk1",
          price: 5000,
          prepayment: 2000,
          paymentLink: "https://pay.example/x",
          timeoutMinutes: 30,
          message: "Ждём вас",
          totalFallback: 5000,
        }}
        onStartOver={onStartOver}
      />
    );

    expect(screen.getByText("Бронь создана")).toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/Оплатите в течение/)).toBeInTheDocument();
    expect(screen.getByText("30:00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Перейти к оплате" }));
    expect(openSpy).toHaveBeenCalledWith(
      "https://pay.example/x",
      "_blank",
      "noopener,noreferrer"
    );

    openSpy.mockRestore();
  });

  it("counts down payment timeout", () => {
    render(
      <StepDone
        result={{
          bookingId: "bk1",
          price: 5000,
          prepayment: 2000,
          paymentLink: null,
          timeoutMinutes: 1,
          message: "ok",
          totalFallback: 5000,
        }}
        onStartOver={vi.fn()}
      />
    );

    expect(screen.getByText("01:00")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("00:59")).toBeInTheDocument();
  });
});
