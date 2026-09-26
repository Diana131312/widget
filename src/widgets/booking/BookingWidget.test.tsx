import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BookingWidget } from "./BookingWidget";

describe("BookingWidget", () => {
  it("starts on category step without back", () => {
    render(<BookingWidget />);

    expect(screen.getByText("Шаг 1 из 5")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Бронирование" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Назад" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Коттеджи" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Бани на дровах" })
    ).toBeInTheDocument();
  });

  it("goes to object step for homes and returns back", async () => {
    const user = userEvent.setup();
    render(<BookingWidget />);

    await user.click(screen.getByRole("button", { name: "Коттеджи" }));

    expect(screen.getByText("Шаг 2 из 5")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Дома" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Назад" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Назад" }));

    expect(screen.getByText("Шаг 1 из 5")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Бронирование" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Назад" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Коттеджи" })).toBeInTheDocument();
  });

  it("goes to object step for banya", async () => {
    const user = userEvent.setup();
    render(<BookingWidget />);

    await user.click(screen.getByRole("button", { name: "Бани на дровах" }));

    expect(screen.getByText("Шаг 2 из 5")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Бани" })).toBeInTheDocument();
  });
});
