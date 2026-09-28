import React, { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    },
  ],
  dailyRooms: [
    {
      id: "d1",
      name: "Дом у озера",
      capacity: 2,
      maxCapacity: 6,
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

const calculateRoom = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    total: 4500,
    basePrice: 4500,
  })
);
const dailyCalculate = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    nights: 1,
    nightPrices: [{ date: "2026-10-10", price: 5000 }],
    totalPrice: 5000,
    periodMessage: null,
  })
);

vi.mock("../../../api", () => ({
  createWidgetApi: () => ({
    calculateRoom,
    dailyCalculate,
  }),
}));

type HarnessProps = {
  categoryId?: "banya" | "homes";
  guestCount?: number;
  productQuantities?: Record<string, number>;
  slotDuration?: number | null;
  slotPrice?: number | null;
  onContinue?: () => void;
};

function Harness({
  categoryId = "banya",
  guestCount = 0,
  productQuantities,
  slotDuration = 3,
  slotPrice = 4500,
  onContinue = vi.fn(),
}: HarnessProps) {
  const [guests, setGuests] = useState(guestCount);
  const [qty, setQty] = useState<Record<string, number>>(
    productQuantities ?? {}
  );
  const [price, setPrice] = useState<number | null>(null);

  return (
    <StepSetup
      categoryId={categoryId}
      config={config}
      roomId={categoryId === "homes" ? "d1" : "b1"}
      checkIn={categoryId === "homes" ? "2026-10-10" : null}
      checkOut={categoryId === "homes" ? "2026-10-12" : null}
      banyaDate={categoryId === "banya" ? "2026-10-07" : null}
      banyaTimeFrom={categoryId === "banya" ? "12:00" : null}
      banyaTimeTo={categoryId === "banya" ? "15:00" : null}
      slotDuration={categoryId === "banya" ? slotDuration : null}
      slotPrice={categoryId === "banya" ? slotPrice : null}
      guestCount={guests}
      productQuantities={qty}
      basePrice={price}
      onGuestCountChange={setGuests}
      onSetProductQty={(id, next) =>
        setQty((prev) => {
          const n = { ...prev };
          if (next <= 0) delete n[id];
          else n[id] = next;
          return n;
        })
      }
      onBasePriceResolved={setPrice}
      onContinue={onContinue}
    />
  );
}

describe("StepSetup", () => {
  beforeEach(() => {
    calculateRoom.mockClear();
    dailyCalculate.mockClear();
    calculateRoom.mockResolvedValue({ total: 4500, basePrice: 4500 });
    dailyCalculate.mockResolvedValue({
      nights: 1,
      nightPrices: [{ date: "2026-10-10", price: 5000 }],
      totalPrice: 5000,
      periodMessage: null,
    });
  });

  it("keeps Next disabled when guests are 0", () => {
    render(<Harness guestCount={0} />);
    expect(screen.getByRole("button", { name: /Далее/ })).toBeDisabled();
    expect(
      screen.getByText(/Укажите количество гостей для расчёта/)
    ).toBeInTheDocument();
    expect(calculateRoom).not.toHaveBeenCalled();
  });

  it("shows catalog accordion and product cards; extra guest stays near guests", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.queryByRole("tab", { name: "Все" })).not.toBeInTheDocument();
    const group = screen.getByText("Веники").closest("details");
    expect(group).toBeTruthy();
    expect(group).not.toHaveAttribute("open");

    await user.click(screen.getByText("Веники"));
    expect(group).toHaveAttribute("open");
    expect(screen.getByText("Берёзовый")).toBeInTheDocument();
    expect(screen.getByText("на фотосессии")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Добавить Берёзовый" })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Добавить Берёзовый" })
    );
    expect(
      screen.getByRole("button", { name: "Убрать Берёзовый" })
    ).toBeInTheDocument();

    expect(screen.getByText("0/8")).toBeInTheDocument();
    expect(screen.getByText("Дополнительный гость")).toBeInTheDocument();
    // гости не на максимуме → доп. гости недоступны
    expect(screen.getByText("0/0")).toBeInTheDocument();
    expect(document.querySelector(".booking-setup__cta")).toBeInTheDocument();
  });

  it("limits extra guests to hard cap of 2 after capacity is full", async () => {
    const user = userEvent.setup();
    render(<Harness guestCount={8} />);

    expect(screen.getByText("8/8")).toBeInTheDocument();
    expect(screen.getByText("0/2")).toBeInTheDocument();

    const addExtra = screen.getByRole("button", {
      name: "Добавить Дополнительный гость",
    });
    await user.click(addExtra);
    await user.click(addExtra);
    expect(screen.getByText("2/2")).toBeInTheDocument();
    expect(addExtra).toBeDisabled();
  });

  it("clamps extra guest qty when guests drop below capacity", async () => {
    const user = userEvent.setup();
    render(<Harness guestCount={8} productQuantities={{ p2: 2 }} />);

    expect(screen.getByText("2/2")).toBeInTheDocument();

    const dec = screen.getByRole("button", {
      name: "Уменьшить количество гостей",
    });
    await user.click(dec);

    await waitFor(() => {
      expect(screen.getByText("7/8")).toBeInTheDocument();
      expect(screen.getByText("0/0")).toBeInTheDocument();
    });
  });

  it("calls calculateRoom with slot duration and enables Next", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<Harness slotDuration={3} slotPrice={4500} onContinue={onContinue} />);

    await user.click(
      screen.getByRole("button", { name: "Увеличить количество гостей" })
    );

    await waitFor(() => {
      expect(calculateRoom).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: "b1",
          date: "2026-10-07",
          time: "12:00",
          duration: 3,
          personCount: 1,
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Далее/ })).not.toBeDisabled();
    });

    expect(screen.getByText(/Подробный расчёт/)).toBeInTheDocument();
    expect(screen.getByText("Кедровая")).toBeInTheDocument();
    expect(screen.getByText("Стоимость")).toBeInTheDocument();
    expect(screen.getByText("Итого")).toBeInTheDocument();
    expect(screen.getAllByText(/4[\s\u00a0]?500/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /Далее/ }));
    expect(onContinue).toHaveBeenCalled();
  });

  it("falls back to slotPrice when API total is 0", async () => {
    calculateRoom.mockResolvedValueOnce({ total: 0, basePrice: 0 });
    const user = userEvent.setup();
    render(<Harness slotDuration={2} slotPrice={3200} />);

    await user.click(
      screen.getByRole("button", { name: "Увеличить количество гостей" })
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Далее/ })).not.toBeDisabled();
    });

    expect(screen.getAllByText(/3[\s\u00a0]?200/).length).toBeGreaterThan(0);
  });

  it("keeps Next disabled when API total is empty without slotPrice", async () => {
    calculateRoom.mockResolvedValue({ total: 0 });
    const user = userEvent.setup();
    render(<Harness slotDuration={3} slotPrice={null} />);

    await user.click(
      screen.getByRole("button", { name: "Увеличить количество гостей" })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Не удалось рассчитать стоимость/)
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Далее/ })).toBeDisabled();
  });

  it("shows calc error with retry", async () => {
    calculateRoom.mockRejectedValueOnce(new Error("network"));
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(
      screen.getByRole("button", { name: "Увеличить количество гостей" })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Не удалось рассчитать стоимость/)
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Далее/ })).toBeDisabled();

    calculateRoom.mockResolvedValueOnce({ total: 4500, basePrice: 4500 });
    await user.click(screen.getByRole("button", { name: "Повторить" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Далее/ })).not.toBeDisabled();
    });
  });

  it("calculates homes stay via dailyCalculate", async () => {
    const user = userEvent.setup();
    render(<Harness categoryId="homes" />);

    expect(screen.getByText("0/6")).toBeInTheDocument();
    // доп. гости только после заполнения вместимости
    expect(screen.getByText("0/0")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Увеличить количество гостей" })
    );
    await user.click(
      screen.getByRole("button", { name: "Увеличить количество гостей" })
    );
    await user.click(
      screen.getByRole("button", { name: "Увеличить количество гостей" })
    );

    expect(screen.getByText("3/6")).toBeInTheDocument();
    expect(screen.getByText("0/0")).toBeInTheDocument();

    await waitFor(() => {
      expect(dailyCalculate).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: "d1",
          checkInDate: "2026-10-10",
          checkOutDate: "2026-10-12",
          personCount: 3,
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Далее/ })).not.toBeDisabled();
    });
    expect(screen.getByText("Дом у озера")).toBeInTheDocument();
    expect(screen.getByText("Стоимость")).toBeInTheDocument();
  });
});
