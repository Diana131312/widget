import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BookingHeader } from "../header/BookingHeader";

describe("BookingHeader", () => {
  it("hides back on first step and shows step counter only", () => {
    render(
      <BookingHeader
        stepId="category"
        title="Бронирование"
        canGoBack={false}
      />
    );

    expect(screen.queryByRole("button", { name: "Назад" })).not.toBeInTheDocument();
    expect(screen.getByText("Шаг 1 из 6")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Бронирование" })
    ).not.toBeInTheDocument();
    expect(document.querySelector(".booking-steps")).not.toBeInTheDocument();
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
    expect(screen.getByText("Шаг 2 из 6")).toBeInTheDocument();
  });

  it("hides step label when hideStepLabel", () => {
    render(
      <BookingHeader
        stepId="object"
        title="Дома"
        hideStepLabel
        showHome
        onHome={vi.fn()}
      />
    );
    expect(screen.queryByText(/Шаг \d+ из/)).not.toBeInTheDocument();
  });

  it("shows verify as step 5 of 6 and done as 6 of 6", () => {
    const { rerender } = render(
      <BookingHeader stepId="verify" canGoBack onBack={vi.fn()} />
    );
    expect(screen.getByText("Шаг 5 из 6")).toBeInTheDocument();

    rerender(<BookingHeader stepId="done" canGoBack onBack={vi.fn()} />);
    expect(screen.getByText("Шаг 6 из 6")).toBeInTheDocument();
  });
});
