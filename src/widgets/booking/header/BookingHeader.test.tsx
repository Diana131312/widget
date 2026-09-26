import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BookingHeader } from "../header/BookingHeader";
import { BOOKING_STEPS } from "../types";

describe("BookingHeader", () => {
  it("hides back on first step", () => {
    render(
      <BookingHeader
        stepId="category"
        title="Бронирование"
        canGoBack={false}
      />
    );

    expect(screen.queryByRole("button", { name: "Назад" })).not.toBeInTheDocument();
    expect(screen.getByText("Шаг 1 из 5")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Бронирование" })).toBeInTheDocument();
  });

  it("shows back and calls onBack", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <BookingHeader
        stepId="object"
        title="Дома"
        canGoBack
        onBack={onBack}
      />
    );

    await user.click(screen.getByRole("button", { name: "Назад" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Шаг 2 из 5")).toBeInTheDocument();
  });

  it("marks current step with aria-current and past steps as buttons", () => {
    const { container } = render(
      <BookingHeader stepId="setup" title="Параметры" />
    );

    const current = container.querySelectorAll(
      '.booking-steps__dot[aria-current="step"]'
    );
    expect(current).toHaveLength(1);

    expect(
      screen.getByRole("button", { name: "Шаг: Категория" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Шаг: Объект" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Шаг: Параметры" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Шаг: Дополнительно" })
    ).not.toBeInTheDocument();

    expect(
      container.querySelectorAll(".booking-steps__dot")
    ).toHaveLength(BOOKING_STEPS.length);
  });

  it("calls onStepClick only for past steps", async () => {
    const user = userEvent.setup();
    const onStepClick = vi.fn();
    render(
      <BookingHeader
        stepId="setup"
        title="Параметры"
        onStepClick={onStepClick}
      />
    );

    await user.click(screen.getByRole("button", { name: "Шаг: Категория" }));
    expect(onStepClick).toHaveBeenCalledWith("category");
  });
});
