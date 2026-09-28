import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addMonths, format, setDate, startOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WidgetApiClient, WidgetRoom } from "../../../api";
import { BookingToastProvider } from "../ui/ToastContext";
import { BanyaCalendarPanel } from "./BanyaCalendarPanel";

const loadMonthlyAvailabilityForRoom = vi.fn();
const loadRoomTimeSlots = vi.fn();

vi.mock("./services", async () => {
  const actual = await vi.importActual<typeof import("./services")>("./services");
  return {
    ...actual,
    loadMonthlyAvailabilityForRoom: (...args: unknown[]) =>
      loadMonthlyAvailabilityForRoom(...args),
    loadRoomTimeSlots: (...args: unknown[]) => loadRoomTimeSlots(...args),
    convertToMonthlyOccupancyData: () => [],
  };
});

const room = { id: "b1", name: "Кедровая", dayPrice: 1500 } as WidgetRoom;
const api = {} as WidgetApiClient;

describe("BanyaCalendarPanel", () => {
  beforeEach(() => {
    loadMonthlyAvailabilityForRoom.mockReset();
    loadRoomTimeSlots.mockReset();
    loadMonthlyAvailabilityForRoom.mockResolvedValue({ days: {} });
    loadRoomTimeSlots.mockResolvedValue([
      {
        timeFrom: "12:00",
        timeTo: "15:00",
        duration: 3,
        price: 4500,
        comment: 'Акция "ЧАС В ПОДАРОК"',
        isAvailable: true,
      },
      {
        timeFrom: "16:00",
        timeTo: "18:00",
        duration: 2,
        price: 3000,
        comment: "Стандарт",
        isAvailable: true,
      },
    ]);
  });

  it("shows slots below calendar on date click and continues after slot", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <BookingToastProvider>
        <BanyaCalendarPanel
          room={room}
          api={api}
          roomName="Кедровая"
          infoSlot={<p>info</p>}
          onContinue={onContinue}
        />
      </BookingToastProvider>
    );

    await waitFor(() => {
      expect(loadMonthlyAvailabilityForRoom).toHaveBeenCalled();
    });

    const nextMonth = addMonths(startOfMonth(new Date()), 1);
    const day = setDate(nextMonth, 10);
    await user.click(screen.getByRole("button", { name: "Следующий месяц" }));
    await user.click(
      screen.getByRole("button", {
        name: format(day, "d MMMM yyyy", { locale: ru }),
      })
    );

    await waitFor(() => {
      expect(screen.getByText(/ЧАС В ПОДАРОК/)).toBeInTheDocument();
    });
    expect(
      document.querySelector(".booking-banya-stage--below")
    ).toBeInTheDocument();
    expect(screen.getByText("Кедровая")).toBeInTheDocument();
    expect(screen.queryByLabelText("Назад")).not.toBeInTheDocument();
    expect(screen.queryByText("Сбросить дату")).not.toBeInTheDocument();
    expect(screen.getByText("3 ч")).toBeInTheDocument();

    const nextBtn = screen.getByRole("button", { name: /Далее/ });
    expect(nextBtn).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /12:00/ }));
    expect(nextBtn).not.toBeDisabled();
    await user.click(nextBtn);

    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        date: format(day, "yyyy-MM-dd"),
        timeFrom: "12:00",
        timeTo: "15:00",
        duration: 3,
        price: expect.any(Number),
      })
    );
  });

  it("shows retry when occupancy fails", async () => {
    const user = userEvent.setup();
    loadMonthlyAvailabilityForRoom.mockRejectedValueOnce(new Error("fail"));
    render(
      <BookingToastProvider>
        <BanyaCalendarPanel
          room={room}
          api={api}
          roomName="Кедровая"
          infoSlot={<p>info</p>}
        />
      </BookingToastProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Повторить" })
      ).toBeInTheDocument();
    });

    loadMonthlyAvailabilityForRoom.mockResolvedValueOnce({ days: {} });
    await user.click(screen.getByRole("button", { name: "Повторить" }));
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Повторить" })
      ).not.toBeInTheDocument();
    });
  });

  it("shows slots error with retry and reloads", async () => {
    const user = userEvent.setup();
    loadRoomTimeSlots.mockRejectedValueOnce(new Error("slots fail"));
    render(
      <BookingToastProvider>
        <BanyaCalendarPanel
          room={room}
          api={api}
          roomName="Кедровая"
          infoSlot={<p>info</p>}
        />
      </BookingToastProvider>
    );

    await waitFor(() => {
      expect(loadMonthlyAvailabilityForRoom).toHaveBeenCalled();
    });

    const nextMonth = addMonths(startOfMonth(new Date()), 1);
    const day = setDate(nextMonth, 14);
    await user.click(screen.getByRole("button", { name: "Следующий месяц" }));
    await user.click(
      screen.getByRole("button", {
        name: format(day, "d MMMM yyyy", { locale: ru }),
      })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Не удалось загрузить слоты/)
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Повторить" })).toBeInTheDocument();

    loadRoomTimeSlots.mockResolvedValueOnce([
      {
        timeFrom: "12:00",
        timeTo: "15:00",
        duration: 3,
        price: 4500,
        comment: "Стандарт",
        isAvailable: true,
      },
    ]);
    await user.click(screen.getByRole("button", { name: "Повторить" }));

    await waitFor(() => {
      expect(screen.getByText("3 ч")).toBeInTheDocument();
    });
    expect(loadRoomTimeSlots).toHaveBeenCalledTimes(2);
  });
});
