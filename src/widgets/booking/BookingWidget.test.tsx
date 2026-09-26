import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingWidget } from "./BookingWidget";

const getConfig = vi.fn(async () => ({
  settings: { tenantId: "11111111-1111-1111-1111-111111111111" },
  rooms: [
    {
      id: "b1",
      name: "Кедровая",
      images: [],
      capacity: 4,
      dayPrice: 1200,
    },
  ],
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
}));

vi.mock("./bootstrap/useBookingBootstrap", async () => {
  const actual = await vi.importActual<
    typeof import("./bootstrap/useBookingBootstrap")
  >("./bootstrap/useBookingBootstrap");
  return {
    ...actual,
    useBookingBootstrap: (args: { stepId: string }) =>
      actual.useBookingBootstrap({
        ...args,
        getConfig,
      } as never),
  };
});

vi.mock("../../api", () => ({
  createWidgetApi: () => ({
    getConfig,
    getDailyOccupied: vi.fn().mockResolvedValue([]),
    getAvailability: vi.fn().mockResolvedValue({ days: {} }),
    getRoomTimes: vi.fn().mockResolvedValue({
      discounts: [],
      times: null,
      slots: [],
      period: null,
      prevPeriod: null,
    }),
  }),
}));

describe("BookingWidget", () => {
  beforeEach(() => {
    getConfig.mockClear();
    window.history.replaceState({}, "", "/");
  });

  it("starts on category step without back", () => {
    render(<BookingWidget />);

    expect(screen.getByText("Шаг 1 из 5")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Бронирование" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Назад" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Коттеджи" })).toBeInTheDocument();
  });

  it("goes to object step for homes and returns back", async () => {
    const user = userEvent.setup();
    render(<BookingWidget />);

    await user.click(screen.getByRole("button", { name: "Коттеджи" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Дома" })).toBeInTheDocument();
    });
    expect(screen.getByText("Шаг 2 из 5")).toBeInTheDocument();
    expect(screen.getByText("Мята")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Назад" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Назад" }));

    expect(screen.getByText("Шаг 1 из 5")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Бронирование" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Коттеджи" })).toBeInTheDocument();
  });

  it("goes to object step for banya", async () => {
    const user = userEvent.setup();
    render(<BookingWidget />);

    await user.click(screen.getByRole("button", { name: "Бани на дровах" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Бани" })).toBeInTheDocument();
    });
    expect(screen.getByText("Кедровая")).toBeInTheDocument();
  });

  it("restores step from URL deep link", async () => {
    window.history.replaceState({}, "", "/?bk_step=object&bk_cat=homes");

    render(<BookingWidget />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Дома" })).toBeInTheDocument();
    });
    expect(screen.getByText("Мята")).toBeInTheDocument();
  });

  it("falls back from invalid setup deep link", async () => {
    window.history.replaceState(
      {},
      "",
      "/?bk_step=setup&bk_cat=homes&bk_room=missing&bk_in=2026-10-10&bk_out=2026-10-12"
    );

    render(<BookingWidget />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Дома" })).toBeInTheDocument();
    });
    expect(window.location.search).toContain("bk_step=object");
    expect(window.location.search).toContain("bk_cat=homes");
  });

  it("shows friendly bootstrap error without raw Failed to fetch", async () => {
    getConfig.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    window.history.replaceState({}, "", "/?bk_step=object&bk_cat=homes");

    render(<BookingWidget />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Не удалось загрузить данные" })
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText("Проверьте интернет и попробуйте ещё раз")
    ).toBeInTheDocument();
    expect(screen.queryByText(/Failed to fetch/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Попробовать снова" })
    ).toBeInTheDocument();
  });
});
