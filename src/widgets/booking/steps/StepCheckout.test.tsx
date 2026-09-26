import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { WidgetGetResponse } from "../../../api";
import { BookingToastProvider } from "../ui/ToastContext";
import { StepCheckout } from "./StepCheckout";

const config = {
  settings: { confirmMessage: "Ждём вас в LES!" },
  rooms: [{ id: "b1", name: "Рябиновая", capacity: 4, maxCapacity: 8 }],
  dailyRooms: [],
  products: [
    {
      id: "p1",
      name: "Веник",
      price: 500,
      isPublic: true,
      productGroupId: "g1",
      roomIds: ["b1"],
      dailyRoomIds: [],
      description: "",
      barcode: null,
      image: null,
    },
    {
      id: "p2",
      name: "Полотенце",
      price: 500,
      isPublic: true,
      productGroupId: "g1",
      roomIds: ["b1"],
      dailyRoomIds: [],
      description: "",
      barcode: null,
      image: null,
    },
  ],
} as unknown as WidgetGetResponse;

function Harness({
  productQuantities = { p1: 1, p2: 1 },
  onStartOver = vi.fn(),
}: {
  productQuantities?: Record<string, number>;
  onStartOver?: () => void;
}) {
  return (
    <BookingToastProvider>
      <StepCheckout
        categoryId="banya"
        config={config}
        roomId="b1"
        checkIn={null}
        checkOut={null}
        banyaDate="2026-10-07"
        banyaTimeFrom="12:00"
        banyaTimeTo="15:00"
        guestCount={1}
        productQuantities={productQuantities}
        basePrice={5200}
        onStartOver={onStartOver}
      />
    </BookingToastProvider>
  );
}

describe("StepCheckout", () => {
  it("shows the same detailed breakdown structure as setup", () => {
    render(<Harness />);

    expect(screen.getByText("Подробный расчёт")).toBeInTheDocument();
    expect(screen.getByText("Баня")).toBeInTheDocument();
    expect(screen.getByText("Рябиновая")).toBeInTheDocument();
    expect(screen.getByText("Дата")).toBeInTheDocument();
    expect(screen.getByText("Время")).toBeInTheDocument();
    expect(screen.getByText("Гостей")).toBeInTheDocument();
    expect(screen.getByText("Стоимость")).toBeInTheDocument();
    expect(screen.getByText("Доп. товары")).toBeInTheDocument();
    expect(screen.getByText("Веник")).toBeInTheDocument();
    expect(screen.getByText("Полотенце")).toBeInTheDocument();
    expect(screen.getByText("Итого")).toBeInTheDocument();

    // стоимость 5200 + товары 1000 = 6200 (may appear more than once in footer)
    expect(screen.getAllByText(/5[\s\u00a0]?200/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/6[\s\u00a0]?200/).length).toBeGreaterThan(0);
    // no duplicate «Стоимость бани» label
    expect(screen.queryByText("Стоимость бани")).not.toBeInTheDocument();
  });

  it("keeps submit disabled until form is valid", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const submit = screen.getByRole("button", { name: "Забронировать" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("ФИО"), "Иван");
    await user.type(screen.getByLabelText("Телефон"), "9001234567");
    expect(submit).toBeDisabled();

    await user.click(screen.getByText(/конфиденциальности/i));
    expect(submit).not.toBeDisabled();
  });

  it("notifies that payment page comes next (no save API)", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("ФИО"), "Иван Петров");
    await user.type(screen.getByLabelText("Телефон"), "9001234567");
    await user.click(screen.getByText(/конфиденциальности/i));
    await user.click(screen.getByRole("button", { name: "Забронировать" }));

    expect(screen.getByText("Почти готово")).toBeInTheDocument();
    expect(
      screen.getAllByText(/Далее будет страница оплаты/).length
    ).toBeGreaterThan(0);
  });

  it("returns to start from success screen", async () => {
    const user = userEvent.setup();
    const onStartOver = vi.fn();
    function Wrap() {
      const [done, setDone] = useState(false);
      if (done) return <p>restarted</p>;
      return (
        <Harness
          onStartOver={() => {
            onStartOver();
            setDone(true);
          }}
        />
      );
    }
    render(<Wrap />);

    await user.type(screen.getByLabelText("ФИО"), "Иван");
    await user.type(screen.getByLabelText("Телефон"), "9001234567");
    await user.click(screen.getByText(/конфиденциальности/i));
    await user.click(screen.getByRole("button", { name: "Забронировать" }));
    await user.click(screen.getByRole("button", { name: "К началу" }));

    expect(onStartOver).toHaveBeenCalled();
    expect(screen.getByText("restarted")).toBeInTheDocument();
  });

  it("shows empty extras when no products selected", () => {
    render(<Harness productQuantities={{}} />);
    expect(screen.getByText("Доп. товары")).toBeInTheDocument();
    expect(screen.getByText("Нет")).toBeInTheDocument();
  });
});
