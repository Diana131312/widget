import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WidgetGetResponse } from "../../../api";
import type { CheckoutContactDraft } from "../checkout/checkoutDraft";
import { BookingToastProvider } from "../ui/ToastContext";
import { StepVerify } from "./StepVerify";

const sendSms = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => vi.fn());
const saveRoomBooking = vi.hoisted(() => vi.fn());
const setToken = vi.hoisted(() => vi.fn());
const startAuthCall = vi.hoisted(() => vi.fn());
const pollAuthCall = vi.hoisted(() => vi.fn());

vi.mock("../../../api", () => ({
  createWidgetApi: () => ({
    sendSms,
    auth,
    saveRoomBooking,
    setToken,
  }),
}));

vi.mock("../checkout/authCall", () => ({
  startAuthCall,
  pollAuthCall,
}));

const config = {
  settings: { confirmMessage: "Ждём вас в LES!" },
  rooms: [{ id: "b1", name: "Рябиновая", capacity: 4, maxCapacity: 8 }],
  dailyRooms: [],
  products: [],
} as unknown as WidgetGetResponse;

function Harness({
  contact = {
    firstName: "Иван",
    lastName: "Петров",
    phone: "+7 (900) 123-45-67",
    comment: "",
    verifyChannel: "telegram" as const,
  },
  onComplete = vi.fn(),
  onBackToCheckout = vi.fn(),
}: {
  contact?: CheckoutContactDraft;
  onComplete?: (r: unknown) => void;
  onBackToCheckout?: () => void;
}) {
  return (
    <BookingToastProvider>
      <StepVerify
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
        productQuantities={{}}
        basePrice={5200}
        contact={contact}
        onComplete={onComplete}
        onBackToCheckout={onBackToCheckout}
      />
    </BookingToastProvider>
  );
}

describe("StepVerify", () => {
  beforeEach(() => {
    sendSms.mockReset();
    auth.mockReset();
    saveRoomBooking.mockReset();
    setToken.mockReset();
    startAuthCall.mockReset();
    pollAuthCall.mockReset();
    sendSms.mockResolvedValue({ success: true });
    auth.mockResolvedValue({ token: "jwt", expiresAt: "2099-01-01" });
    saveRoomBooking.mockResolvedValue({
      bookingId: "bk1",
      price: 5200,
      amount: 3000,
      paymentLink: null,
      timeoutMinutes: 30,
    });
    startAuthCall.mockResolvedValue({ dialNumber: "+78001234567", raw: {} });
    pollAuthCall.mockResolvedValue({ confirmed: false, raw: {} });
  });

  it("auto-sends SMS for telegram channel", async () => {
    render(<Harness />);
    await waitFor(() => {
      expect(sendSms).toHaveBeenCalledWith(
        expect.objectContaining({
          number: "+79001234567",
          messenger: "telegram",
        })
      );
    });
    expect(screen.getByText("Код из сообщения")).toBeInTheDocument();
  });

  it("creates booking with lean save payload", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);

    await waitFor(() => expect(sendSms).toHaveBeenCalled());
    await user.type(screen.getByLabelText("Код"), "1234");
    await user.click(
      screen.getByRole("button", { name: "Подтвердить и забронировать" })
    );

    await waitFor(() => {
      expect(saveRoomBooking).toHaveBeenCalledWith({
        roomId: "b1",
        date: "2026-10-07",
        time: "12:00:00",
        duration: 3,
        personCount: 1,
        name: "Иван",
        lastName: "Петров",
        phone: "+79001234567",
        messenger: "telegram",
        comment: "",
        promoCode: null,
        discounts: [],
        products: [],
        checkCode: "1234",
      });
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it("starts call verification when channel is call", async () => {
    render(
      <Harness
        contact={{
          firstName: "Иван",
          lastName: "Петров",
          phone: "+7 (900) 123-45-67",
          comment: "",
          verifyChannel: "call",
        }}
      />
    );

    await waitFor(() => {
      expect(startAuthCall).toHaveBeenCalledWith("+79001234567");
    });
    expect(screen.getByText("Подтверждение звонком")).toBeInTheDocument();
    expect(sendSms).not.toHaveBeenCalled();
  });

  it("shows max fallback note on verify step", async () => {
    render(
      <Harness
        contact={{
          firstName: "Иван",
          lastName: "Петров",
          phone: "+7 (900) 123-45-67",
          comment: "",
          verifyChannel: "max",
        }}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Если нет аккаунта в MAX/i)
      ).toBeInTheDocument();
    });
  });

  it("puts bot link inside hint when telegram needs bot verification", async () => {
    sendSms.mockResolvedValueOnce({
      success: false,
      needBotVerification: true,
      botLink: "https://t.me/les_bot",
    });
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    const hint = screen.getByRole("alert");
    expect(hint).toHaveClass("booking-checkout__hint");
    expect(hint).toHaveTextContent(/Откройте бота/i);
    const link = within(hint).getByRole("link", { name: "Открыть бота" });
    expect(link).toHaveAttribute("href", "https://t.me/les_bot");
    expect(link).toHaveClass("booking-checkout__bot-link");
  });
});
