import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { WidgetGetResponse } from "../../../api";
import { BookingToastProvider } from "../ui/ToastContext";
import { StepObject } from "./StepObject";

const config = {
  settings: { tenantId: "11111111-1111-1111-1111-111111111111" },
  dailyRooms: [
    {
      id: "d1",
      name: "Мята",
      images: [],
      capacity: 2,
      maxCapacity: 4,
      checkInTime: "14:00",
      checkOutTime: "12:00",
      minNights: 1,
      maxNights: null,
      pricePeriod: {
        weekDayPrice: 5000,
        weekEndPrice: 7000,
        preWeekEndPrice: 6000,
        extraGuestWeekDay: 0,
        extraGuestWeekEnd: 0,
        extraGuestPreWeekEnd: 0,
      },
    },
  ],
  rooms: [
    {
      id: "b1",
      name: "Кедровая",
      images: [],
      capacity: 6,
      maxCapacity: 10,
      dayPrice: 1500,
    },
  ],
} as unknown as WidgetGetResponse;

vi.mock("../../../api", () => ({
  createWidgetApi: () => ({
    getDailyOccupied: vi.fn().mockResolvedValue([]),
    getAvailability: vi.fn().mockResolvedValue({ days: {} }),
    getRoomTimes: vi.fn().mockResolvedValue({
      discounts: [],
      times: null,
      slots: [
        {
          timeFrom: "12:00",
          timeTo: "15:00",
          duration: 3,
          price: 4500,
          comment: "Стандарт",
          isAvailable: true,
        },
      ],
      period: null,
      prevPeriod: null,
    }),
  }),
}));

function renderStep(
  categoryId: "homes" | "banya",
  cfg: WidgetGetResponse = config
) {
  return render(
    <BookingToastProvider>
      <StepObject
        categoryId={categoryId}
        config={cfg}
        onSelectHome={vi.fn()}
        onSelectBanya={vi.fn()}
      />
    </BookingToastProvider>
  );
}

describe("StepObject", () => {
  it("renders home cards with calendar continue", async () => {
    renderStep("homes");
    expect(screen.getByText("Мята")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Далее/ })).toBeDisabled();
  });

  it("renders banya cards", () => {
    renderStep("banya");
    expect(screen.getByText("Кедровая")).toBeInTheDocument();
  });

  it("opens gallery modal on photo click", async () => {
    const user = userEvent.setup();
    renderStep("homes");

    await user.click(screen.getByLabelText(/Мята: открыть галерею/));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Закрыть" })).toBeInTheDocument();
  });

  it("shows empty state", () => {
    const empty = {
      ...config,
      dailyRooms: [],
    } as unknown as WidgetGetResponse;
    renderStep("homes", empty);
    expect(screen.getByText(/Нет доступных домов/)).toBeInTheDocument();
  });

  it("renders description in info", () => {
    const withDesc = {
      ...config,
      rooms: [
        {
          ...config.rooms![0],
          description: "Первая строка\\nВторая строка",
        },
      ],
    } as unknown as WidgetGetResponse;
    renderStep("banya", withDesc);
    expect(screen.getByText(/Первая строка/)).toBeInTheDocument();
  });
});
