import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { RoomTimeSlot } from "../../../api";
import { BanyaTimeSlots } from "./BanyaTimeSlots";

function slot(
  partial: Partial<RoomTimeSlot> & Pick<RoomTimeSlot, "timeFrom">
): RoomTimeSlot {
  return {
    timeTo: "12:00",
    duration: 2,
    price: 1000,
    isAvailable: true,
    comment: null,
    ...partial,
  } as RoomTimeSlot;
}

describe("BanyaTimeSlots preview", () => {
  it("shows the first four free slots, then every slot grouped by comment", async () => {
    const user = userEvent.setup();
    const slots = [
      slot({ timeFrom: "10:00" }),
      slot({ timeFrom: "12:00" }),
      slot({ timeFrom: "14:00" }),
      slot({ timeFrom: "16:00" }),
      slot({ timeFrom: "18:00", comment: "Вечер" }),
      slot({ timeFrom: "20:00", isAvailable: false }),
    ];

    render(
      <BanyaTimeSlots
        slots={slots}
        selectedIndex={null}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /10:00/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /16:00/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /18:00/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /20:00/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Вечер")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Показать все слоты" }));

    expect(screen.getByRole("button", { name: /18:00/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /20:00/ })).toBeDisabled();
    expect(screen.getByRole("heading", { name: "Вечер" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Стандарт" })).not.toBeInTheDocument();
  });

  it("shows only the empty plaque when every slot is busy", () => {
    render(
      <BanyaTimeSlots
        slots={[slot({ timeFrom: "10:00", isAvailable: false })]}
        selectedIndex={null}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText("Нет свободных слотов")).toBeInTheDocument();
    expect(
      screen.queryByText("Можно посмотреть всё время на эту дату")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Показать все слоты" })
    ).not.toBeInTheDocument();
  });
});
