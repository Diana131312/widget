import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { WidgetGetResponse } from "../../../api";
import { StepSetup } from "./StepSetup";

const config = {
  settings: { tenantId: "11111111-1111-1111-1111-111111111111" },
  rooms: [
    {
      id: "b1",
      name: "Кедровая",
      capacity: 4,
      maxCapacity: 8,
      pricePeriod: {
        includedCapacity: 6,
        extraValue: 1000,
        extraType: 0,
      },
    },
  ],
  dailyRooms: [
    {
      id: "d1",
      name: "Дом у озера",
      capacity: 2,
      maxCapacity: 6,
      pricePeriod: {
        weekDayPrice: 5000,
        weekEndPrice: 5000,
        preWeekEndPrice: 5000,
        extraGuestWeekDay: 1000,
        extraGuestWeekEnd: 1000,
        extraGuestPreWeekEnd: 1000,
      },
    },
  ],
  productGroups: [{ id: "g1", name: "Веники", image: null }],
  products: [
    {
      id: "p1",
      name: "Берёзовый",
      description: "Хороший веник для парения",
      barcode: null,
      image: null,
      price: 500,
      productGroupId: "g1",
      isPublic: true,
      roomIds: ["b1"],
      dailyRoomIds: ["d1"],
    },
    {
      id: "p2",
      name: "Дополнительный гость",
      description: "",
      barcode: null,
      image: null,
      price: 700,
      productGroupId: "g1",
      isPublic: true,
      roomIds: ["b1"],
      dailyRoomIds: ["d1"],
    },
  ],
} as unknown as WidgetGetResponse;

type HarnessProps = {
  categoryId?: "banya" | "homes";
  guestCount?: number;
  productQuantities?: Record<string, number>;
  onContinue?: () => void;
};

function Harness({
  categoryId = "banya",
  guestCount = 0,
  productQuantities,
  onContinue = vi.fn(),
}: HarnessProps) {
  const [guests, setGuests] = useState(guestCount);
  const [qty, setQty] = useState<Record<string, number>>(
    productQuantities ?? {}
  );

  return (
    <StepSetup
      categoryId={categoryId}
      config={config}
      roomId={categoryId === "homes" ? "d1" : "b1"}
      guestCount={guests}
      productQuantities={qty}
      onGuestCountChange={setGuests}
      onSetProductQty={(id, next) =>
        setQty((prev) => {
          const n = { ...prev };
          if (next <= 0) delete n[id];
          else n[id] = next;
          return n;
        })
      }
      onContinue={onContinue}
    />
  );
}

describe("StepSetup", () => {
  it("keeps Next disabled when guests are 0", () => {
    render(<Harness guestCount={0} />);
    expect(screen.getByRole("button", { name: /Далее/ })).toBeDisabled();
    expect(screen.queryByText(/Подробный расчёт/)).not.toBeInTheDocument();
  });

  it("enables Next as soon as guests are set (no calculate wait)", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<Harness onContinue={onContinue} />);

    expect(screen.getByRole("button", { name: /Далее/ })).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Увеличить количество гостей" })
    );
    expect(screen.getByRole("button", { name: /Далее/ })).not.toBeDisabled();
    await user.click(screen.getByRole("button", { name: /Далее/ }));
    expect(onContinue).toHaveBeenCalled();
  });

  it("shows catalog accordion; hides catalog extra-guest product", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.queryByRole("tab", { name: "Все" })).not.toBeInTheDocument();
    const group = screen.getByText("Веники").closest("details");
    expect(group).toBeTruthy();
    expect(group).not.toHaveAttribute("open");

    await user.click(screen.getByText("Веники"));
    expect(group).toHaveAttribute("open");
    expect(screen.getByText("Берёзовый")).toBeInTheDocument();
    expect(screen.queryByText("Дополнительный гость")).not.toBeInTheDocument();
    expect(screen.getByText("0/6")).toBeInTheDocument();
    expect(document.querySelector(".booking-setup__cta")).toBeInTheDocument();
    const extra = document.querySelector(".booking-setup__extra-guest");
    expect(extra).toBeInTheDocument();
    expect(extra).toHaveClass("booking-setup__extra-guest--disabled");
    expect(screen.getByText("0/2")).toBeInTheDocument();
  });

  it("unlocks extra guests only after includedCapacity is filled", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const extra = document.querySelector(".booking-setup__extra-guest");
    expect(extra).toHaveClass("booking-setup__extra-guest--disabled");
    expect(
      screen.getByRole("button", {
        name: "Увеличить количество дополнительных гостей",
      })
    ).toBeDisabled();

    for (let i = 0; i < 6; i += 1) {
      await user.click(
        screen.getByRole("button", { name: "Увеличить количество гостей" })
      );
    }

    expect(screen.getByText("6/6")).toBeInTheDocument();
    expect(extra).not.toHaveClass("booking-setup__extra-guest--disabled");
    expect(
      screen.getByRole("button", {
        name: "Увеличить количество дополнительных гостей",
      })
    ).not.toBeDisabled();

    await user.click(
      screen.getByRole("button", {
        name: "Увеличить количество дополнительных гостей",
      })
    );
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("calculates homes guest counters without calculate API", async () => {
    const user = userEvent.setup();
    render(<Harness categoryId="homes" />);

    expect(screen.getByText("0/2")).toBeInTheDocument();
    const extra = document.querySelector(".booking-setup__extra-guest");
    expect(extra).toBeInTheDocument();
    expect(extra).toHaveClass("booking-setup__extra-guest--disabled");

    await user.click(
      screen.getByRole("button", { name: "Увеличить количество гостей" })
    );
    await user.click(
      screen.getByRole("button", { name: "Увеличить количество гостей" })
    );

    expect(screen.getByText("2/2")).toBeInTheDocument();
    expect(extra).not.toHaveClass("booking-setup__extra-guest--disabled");
    expect(screen.getByRole("button", { name: /Далее/ })).not.toBeDisabled();
  });
});
