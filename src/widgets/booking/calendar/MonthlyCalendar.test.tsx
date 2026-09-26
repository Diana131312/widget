import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { format, startOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { MonthlyCalendar } from "./MonthlyCalendar";

function ControlledMonth({
  selectedDate,
  onMonthChange,
}: {
  selectedDate: Date;
  onMonthChange?: (m: Date) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(selectedDate));
  return (
    <MonthlyCalendar
      data={[]}
      initialDate={month}
      selectedDate={selectedDate}
      onMonthChange={(m) => {
        setMonth(m);
        onMonthChange?.(m);
      }}
      onDateClick={() => {}}
    />
  );
}

describe("MonthlyCalendar", () => {
  it("navigates to previous month even when a day is selected", async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    const selected = new Date(2026, 9, 7); // 7 октября

    render(
      <ControlledMonth selectedDate={selected} onMonthChange={onMonthChange} />
    );

    expect(
      screen.getByText(format(selected, "LLLL yyyy", { locale: ru }))
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Предыдущий месяц" }));

    expect(onMonthChange).toHaveBeenCalled();
    const shown = onMonthChange.mock.calls.at(-1)?.[0] as Date;
    expect(format(shown, "yyyy-MM")).toBe("2026-09");
    expect(
      screen.getByText(format(shown, "LLLL yyyy", { locale: ru }))
    ).toBeInTheDocument();
  });
});
