import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addMonths, format, setDate, startOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { describe, expect, it, vi } from "vitest";
import { DailyRangeCalendar } from "./DailyRangeCalendar";

describe("DailyRangeCalendar occupancy / limits UI", () => {
  it("shows retry and blocks continue path via hasError", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onRangeChange = vi.fn();

    render(
      <DailyRangeCalendar
        occupiedNights={new Set()}
        hasError
        onRetry={onRetry}
        onRangeChange={onRangeChange}
      />
    );

    expect(
      screen.getByText(/Не удалось загрузить занятость/)
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Повторить" }));
    expect(onRetry).toHaveBeenCalled();

    const nextMonth = addMonths(startOfMonth(new Date()), 1);
    const day = setDate(nextMonth, 10);
    await user.click(screen.getByRole("button", { name: "Следующий месяц" }));
    expect(
      screen.getByRole("button", {
        name: format(day, "d MMMM yyyy", { locale: ru }),
      })
    ).toBeDisabled();
  });

  it("shows minNights error message and does not complete range", async () => {
    const user = userEvent.setup();
    const onRangeChange = vi.fn();
    const nextMonth = addMonths(startOfMonth(new Date()), 1);
    const start = setDate(nextMonth, 10);
    const end = setDate(nextMonth, 11);

    render(
      <DailyRangeCalendar
        occupiedNights={new Set()}
        limits={{ minNights: 2 }}
        onRangeChange={onRangeChange}
      />
    );

    await user.click(screen.getByRole("button", { name: "Следующий месяц" }));
    await user.click(
      screen.getByRole("button", {
        name: format(start, "d MMMM yyyy", { locale: ru }),
      })
    );
    await user.click(
      screen.getByRole("button", {
        name: format(end, "d MMMM yyyy", { locale: ru }),
      })
    );

    expect(screen.getByText(/Минимум 2/)).toBeInTheDocument();
    const last = onRangeChange.mock.calls.at(-1)?.[0];
    expect(last).toBeNull();
  });
});
