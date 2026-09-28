import React, { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WidgetGetResponse } from "../../../api";
import { BookingToastProvider } from "../ui/ToastContext";
import { StepCheckout } from "./StepCheckout";

const sendSms = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => vi.fn());
const saveRoomBooking = vi.hoisted(() => vi.fn());
const dailySave = vi.hoisted(() => vi.fn());
const setToken = vi.hoisted(() => vi.fn());

vi.mock("../../../api", () => ({
  createWidgetApi: () => ({
    sendSms,
    auth,
    saveRoomBooking,
    dailySave,
    setToken,
  }),
}));

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
        slotDuration={3}
        guestCount={1}
        productQuantities={productQuantities}
        basePrice={5200}
        onStartOver={onStartOver}
      />
    </BookingToastProvider>
  );
}

describe("StepCheckout", () => {
  beforeEach(() => {
    sendSms.mockReset();
    auth.mockReset();
    saveRoomBooking.mockReset();
    dailySave.mockReset();
    setToken.mockReset();
    sendSms.mockResolvedValue({ success: true });
    auth.mockResolvedValue({ token: "jwt", expiresAt: "2099-01-01" });
    saveRoomBooking.mockResolvedValue({
      bookingId: "bk1",
      price: 6200,
      amount: 3000,
      paymentLink: null,
      timeoutMinutes: 30,
    });
  });

  it("shows the same detailed breakdown structure as setup", () => {
    render(<Harness />);

    expect(screen.getByText("Подробный расчёт")).toBeInTheDocument();
    expect(screen.getByText("Баня")).toBeInTheDocument();
    expect(screen.getByText("Рябиновая")).toBeInTheDocument();
    expect(screen.getByText("Дата")).toBeInTheDocument();
    expect(screen.getByText("Время")).toBeInTheDocument();
    expect(screen.getByText("Гостей")).toBeInTheDocument();
    expect(screen.getAllByText("Стоимость").length).toBeGreaterThan(0);
    expect(screen.getByText("Доп. товары")).toBeInTheDocument();
    expect(screen.getByText("Веник")).toBeInTheDocument();
    expect(screen.getByText("Полотенце")).toBeInTheDocument();
    expect(screen.getByText("Итого")).toBeInTheDocument();

    expect(screen.getAllByText(/5[\s\u00a0]?200/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/6[\s\u00a0]?200/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Стоимость бани")).not.toBeInTheDocument();
    expect(
      screen.getByText(/предоплаты появится после создания брони/i)
    ).toBeInTheDocument();
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

  it("sends SMS then creates booking with checkCode after OTP", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("ФИО"), "Иван Петров");
    await user.type(screen.getByLabelText("Телефон"), "9001234567");
    await user.click(screen.getByText(/конфиденциальности/i));
    await user.click(screen.getByRole("button", { name: "Забронировать" }));

    await waitFor(() => {
      expect(sendSms).toHaveBeenCalledWith(
        expect.objectContaining({
          number: "+79001234567",
          messenger: "telegram",
        })
      );
    });

    expect(screen.getByText("Подтверждение телефона")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Код из сообщения"), "1234");
    await user.click(
      screen.getByRole("button", { name: "Подтвердить и забронировать" })
    );

    await waitFor(() => {
      expect(auth).toHaveBeenCalledWith({
        phone: "+79001234567",
        code: "1234",
      });
      expect(saveRoomBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: "b1",
          date: "2026-10-07",
          time: "12:00",
          duration: 3,
          personCount: 1,
          checkCode: "1234",
          products: expect.any(Array),
        })
      );
    });

    expect(screen.getByText("Бронь создана")).toBeInTheDocument();
    expect(screen.getByText(/Предоплата/)).toBeInTheDocument();
    expect(screen.getAllByText(/3[\s\u00a0]?000/).length).toBeGreaterThan(0);
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
    await waitFor(() => {
      expect(screen.getByLabelText("Код из сообщения")).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText("Код из сообщения"), "1234");
    await user.click(
      screen.getByRole("button", { name: "Подтвердить и забронировать" })
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "К началу" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "К началу" }));

    expect(onStartOver).toHaveBeenCalled();
    expect(screen.getByText("restarted")).toBeInTheDocument();
  });

  it("shows empty extras when no products selected", () => {
    render(<Harness productQuantities={{}} />);
    expect(screen.getByText("Доп. товары")).toBeInTheDocument();
    expect(screen.getByText("Нет")).toBeInTheDocument();
  });

  it("shows wrong-code message when auth fails", async () => {
    const user = userEvent.setup();
    auth.mockRejectedValueOnce(
      Object.assign(new Error("Widget API request failed: 400 Bad Request"), {
        status: 400,
        body: { message: "Invalid code" },
      })
    );
    render(<Harness />);

    await user.type(screen.getByLabelText("ФИО"), "Иван Петров");
    await user.type(screen.getByLabelText("Телефон"), "9001234567");
    await user.click(screen.getByText(/конфиденциальности/i));
    await user.click(screen.getByRole("button", { name: "Забронировать" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Код из сообщения")).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText("Код из сообщения"), "0000");
    await user.click(
      screen.getByRole("button", { name: "Подтвердить и забронировать" })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Неверный код подтверждения/)
      ).toBeInTheDocument();
    });
    expect(saveRoomBooking).not.toHaveBeenCalled();
  });
});
