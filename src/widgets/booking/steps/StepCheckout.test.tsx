import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { WidgetGetResponse } from "../../../api";
import { StepCheckout } from "./StepCheckout";

const config = {
  settings: { confirmMessage: "Ждём вас в LES!" },
  rooms: [
    {
      id: "b1",
      name: "Рябиновая",
      capacity: 4,
      maxCapacity: 8,
      pricePeriod: {
        includedCapacity: 6,
        extraValue: 1000,
        extraType: 0,
      },
    },
  ],
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
  ],
} as unknown as WidgetGetResponse;

function Harness({
  onContinue = vi.fn(),
  guestCount = 7,
  calcMeta = {
    prepay: 3000,
    prepayIncludesProducts: false,
    extraValueForDate: 1000,
    discountAmount: null,
    discountText: null,
    amountBeforeDiscount: null,
  },
}: {
  onContinue?: (contact: unknown) => void;
  guestCount?: number;
  calcMeta?: {
    prepay: number | null;
    prepayIncludesProducts: boolean | null;
    extraValueForDate: number | null;
    discountAmount: number | null;
    discountText: string | null;
    amountBeforeDiscount: number | null;
  } | null;
}) {
  return (
    <StepCheckout
      categoryId="banya"
      config={config}
      roomId="b1"
      checkIn={null}
      checkOut={null}
      banyaDate="2026-10-07"
      banyaTimeFrom="12:00"
      banyaTimeTo="15:00"
      slotDuration={3}
      guestCount={guestCount}
      productQuantities={{ p1: 1 }}
      basePrice={5200}
      calcMeta={calcMeta}
      onContinue={onContinue}
    />
  );
}

describe("StepCheckout", () => {
  it("shows prepay and computed extra guest surcharge", () => {
    render(<Harness />);
    expect(screen.getByText("Предоплата")).toBeInTheDocument();
    expect(screen.getAllByText(/3[\s\u00a0]?000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Доп\. гости/)).toBeInTheDocument();
    // 1 доп. гость × 1000
    expect(screen.getAllByText(/1[\s\u00a0]?000/).length).toBeGreaterThan(0);
  });

  it("keeps submit disabled until form is valid", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const submit = screen.getByRole("button", { name: "Далее →" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Фамилия"), "Петров");
    await user.type(screen.getByLabelText("Имя"), "Иван");
    await user.type(screen.getByLabelText("Телефон"), "9001234567");
    expect(submit).toBeDisabled();

    await user.click(screen.getByText(/конфиденциальности/i));
    expect(submit).not.toBeDisabled();
  });

  it("passes separate name fields and phone channel", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<Harness onContinue={onContinue} />);

    await user.type(screen.getByLabelText("Фамилия"), "Петров");
    await user.type(screen.getByLabelText("Имя"), "Иван");
    await user.type(screen.getByLabelText("Телефон"), "9001234567");
    await user.click(screen.getByText("По телефону"));
    await user.click(screen.getByText(/конфиденциальности/i));
    await user.click(screen.getByRole("button", { name: "Далее →" }));

    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Иван",
        lastName: "Петров",
        verifyChannel: "call",
      })
    );
  });

  it("shows max and telegram channel notes", async () => {
    const user = userEvent.setup();
    render(
      <StepCheckout
        categoryId="banya"
        config={
          {
            ...config,
            company: { telegram: "@les_bot" },
          } as unknown as WidgetGetResponse
        }
        roomId="b1"
        checkIn={null}
        checkOut={null}
        banyaDate="2026-10-07"
        banyaTimeFrom="12:00"
        banyaTimeTo="15:00"
        guestCount={1}
        productQuantities={{}}
        basePrice={5200}
        onContinue={vi.fn()}
      />
    );

    expect(screen.getByText(/Важно, чтобы бот/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "ссылка на бота" })
    ).toHaveAttribute("href", "https://t.me/les_bot");

    await user.click(screen.getByText("MAX"));
    expect(
      screen.queryByText(/Если нет аккаунта в MAX/i)
    ).not.toBeInTheDocument();
  });
});
