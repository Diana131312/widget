import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  addDays,
  addMonths,
  format,
  setDate,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { ru } from "date-fns/locale";
import { describe, expect, it, vi } from "vitest";
import { DailyRangeCalendar } from "./DailyRangeCalendar";

describe("DailyRangeCalendar UI", () => {
  it("keeps start/end slots even without selection", () => {
    render(
      <DailyRangeCalendar occupiedNights={new Set()} onRangeChange={vi.fn()} />
    );
    expect(screen.getByText("Начало")).toBeInTheDocument();
    expect(screen.getByText("Окончание")).toBeInTheDocument();
  });

  it("selects a range and updates summary + callback", async () => {
    const user = userEvent.setup();
    const onRangeChange = vi.fn();
    // Стабильные даты в следующем месяце — без границы текущего
    const nextMonth = addMonths(startOfMonth(new Date()), 1);
    const start = setDate(nextMonth, 10);
    const end = setDate(nextMonth, 12);

    const startLabel = format(start, "d MMMM yyyy", { locale: ru });
    const endLabel = format(end, "d MMMM yyyy", { locale: ru });

    render(
      <DailyRangeCalendar
        occupiedNights={new Set()}
        onRangeChange={onRangeChange}
      />
    );

    await user.click(screen.getByRole("button", { name: "Следующий месяц" }));
    await user.click(screen.getByRole("button", { name: startLabel }));
    await user.click(screen.getByRole("button", { name: endLabel }));

    const last = onRangeChange.mock.calls.at(-1)?.[0];
    expect(last).toMatchObject({
      checkIn: format(start, "yyyy-MM-dd"),
      checkOut: format(end, "yyyy-MM-dd"),
      nights: 2,
    });
    expect(screen.getByText(startLabel)).toBeInTheDocument();
    expect(screen.getByText(endLabel)).toBeInTheDocument();
  });

  it("disables past day buttons when visible", () => {
    render(<DailyRangeCalendar occupiedNights={new Set()} />);
    const yesterday = addDays(startOfDay(new Date()), -1);
    const label = format(yesterday, "d MMMM yyyy", { locale: ru });
    const btn = screen.queryByRole("button", { name: label });
    if (btn) {
      expect(btn).toBeDisabled();
    }
  });
});
