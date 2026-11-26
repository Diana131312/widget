import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WidgetGetResponse } from "../../../api";
import {
  BOOKING_AUTH_STORAGE_KEY,
  saveAuthToken,
} from "../checkout/authToken";
import { BookingToastProvider } from "../ui/ToastContext";
import { StepCheckout } from "./StepCheckout";

const openBookingPayment = vi.hoisted(() => vi.fn());
const checkBookingCertificate = vi.hoisted(() => vi.fn());

vi.mock("../checkout/bookingPay", async () => {
  const actual = await vi.importActual<typeof import("../checkout/bookingPay")>(
    "../checkout/bookingPay"
  );
  return {
    ...actual,
    openBookingPayment,
    checkBookingCertificate,
  };
});

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

const calculateRoom = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    total: 5200,
    basePrice: 5200,
    prepay: 3000,
    prepayIncludesProducts: true,
    extraValueForDate: 1000,
  })
);

const saveRoomBooking = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    bookingId: "bk-1",
    amount: 3500,
    paymentLink: "https://pay.example/1",
    paymentMode: "prepay",
  })
);

const setToken = vi.hoisted(() => vi.fn());

vi.mock("../../../api", () => ({
  createWidgetApi: () => ({
    calculateRoom,
    dailyCalculate: vi.fn(),
    saveRoomBooking,
    dailySave: vi.fn(),
    setToken,
  }),
}));

function Harness({
  onBooked = vi.fn(),
  onContinue = vi.fn(),
  guestCount = 7,
  invoicePayment = false,
}: {
  onBooked?: (
    contact: unknown,
    result: unknown
  ) => void;
  onContinue?: (contact: unknown) => void;
  guestCount?: number;
  invoicePayment?: boolean;
}) {
  return (
    <BookingToastProvider>
      <StepCheckout
        categoryId="banya"
        config={{ ...config, invoicePayment }}
        roomId="b1"
        checkIn={null}
        checkOut={null}
        banyaDate="2026-10-07"
        banyaTimeFrom="12:00"
        banyaTimeTo="15:00"
        slotDuration={3}
        slotPrice={5200}
        guestCount={guestCount}
        productQuantities={{ p1: 1 }}
        basePrice={null}
        calcMeta={null}
        onBasePriceResolved={vi.fn()}
        onContinue={onContinue}
        onBooked={onBooked}
      />
    </BookingToastProvider>
  );
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => {
    expect(screen.getByText("К оплате")).toBeInTheDocument();
  });
  // поля могут быть предзаполнены из токена — вводим заново
  for (const [label, value] of [
    ["Фамилия", "Петров"],
    ["Имя", "Иван"],
    ["Телефон", "9001234567"],
  ]) {
    await user.clear(screen.getByLabelText(label));
    await user.type(screen.getByLabelText(label), value);
  }
  await user.click(screen.getByText(/Я соглашаюсь/i));
}

describe("StepCheckout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    localStorage.clear();
    setToken.mockClear();
    calculateRoom.mockClear();
    saveRoomBooking.mockClear();
    openBookingPayment.mockReset();
    checkBookingCertificate.mockReset();
    saveRoomBooking.mockResolvedValue({
      bookingId: "bk-1",
      amount: 3500,
      paymentLink: "https://pay.example/1",
      paymentMode: "prepay",
    });
    calculateRoom.mockResolvedValue({
      total: 5200,
      basePrice: 5200,
      prepay: 3000,
      prepayIncludesProducts: true,
      extraValueForDate: 1000,
    });
  });

  it("shows prepay with products and computed extra guest surcharge", async () => {
    render(<Harness />);
    await waitFor(() => {
      expect(screen.getByText("К оплате")).toBeInTheDocument();
    });
    expect(screen.getAllByText(/3[\s\u00a0]?500/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Доп\. гости/)).toBeInTheDocument();
    expect(screen.getByLabelText("Промокод")).toBeInTheDocument();
    expect(screen.getByLabelText("Сертификат")).toBeInTheDocument();
    expect(screen.getAllByText(/1[\s\u00a0]?000/).length).toBeGreaterThan(0);
  });

  it("keeps the button clickable and highlights empty main fields", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<Harness onContinue={onContinue} />);

    await waitFor(() => {
      expect(screen.getByText("К оплате")).toBeInTheDocument();
    });

    const submit = screen.getByRole("button", { name: "Далее →" });
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(onContinue).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Фамилия")).toHaveClass(
      "booking-checkout__input--invalid"
    );
    expect(screen.getByLabelText("Имя")).toHaveClass(
      "booking-checkout__input--invalid"
    );
    expect(screen.getByLabelText("Телефон")).toHaveClass(
      "booking-checkout__input--invalid"
    );

    await user.type(screen.getByLabelText("Фамилия"), "Петров");
    await user.type(screen.getByLabelText("Имя"), "Иван");
    await user.type(screen.getByLabelText("Телефон"), "9001234567");
    expect(screen.getByLabelText("Фамилия")).not.toHaveClass(
      "booking-checkout__input--invalid"
    );
    await user.click(screen.getByText(/Я соглашаюсь/i));
    await user.click(submit);
    expect(onContinue).toHaveBeenCalled();
  });

  it("opens service offer modal from terms link", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await waitFor(() => {
      expect(calculateRoom).toHaveBeenCalled();
    });

    await user.click(
      screen.getByRole("button", { name: /бронирования услуг/i })
    );
    expect(
      screen.getByRole("dialog", { name: /Условия предоставления услуг/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/ПУБЛИЧНАЯ ОФЕРТА/i)).toBeInTheDocument();
  });

  it("without saved token goes to verification and does not save", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const onBooked = vi.fn();
    render(<Harness onContinue={onContinue} onBooked={onBooked} />);

    await fillForm(user);
    await user.click(screen.getByLabelText("MAX"));
    await user.click(screen.getByLabelText(/Полная/));
    await user.click(screen.getByRole("button", { name: "Далее →" }));

    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Иван",
        lastName: "Петров",
        verifyChannel: "max",
        paymentMode: "full",
      })
    );
    expect(saveRoomBooking).not.toHaveBeenCalled();
    expect(onBooked).not.toHaveBeenCalled();
  });

  it("with saved token for this phone books right away", async () => {
    saveAuthToken({
      token: "jwt-saved",
      expiresAt: "2099-01-01T00:00:00Z",
      phone: "+7 (900) 123-45-67",
    });
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const onBooked = vi.fn();
    render(<Harness onContinue={onContinue} onBooked={onBooked} />);

    await fillForm(user);
    expect(screen.queryByText(/Номер уже подтверждён/)).not.toBeInTheDocument();
    expect(screen.queryByText("Telegram")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Забронировать" }));

    await waitFor(() => {
      expect(saveRoomBooking).toHaveBeenCalled();
    });
    expect(setToken).toHaveBeenCalledWith("jwt-saved");
    expect(saveRoomBooking.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        name: "Иван",
        phone: "+79001234567",
        paymentMode: "prepay",
      })
    );
    expect(saveRoomBooking.mock.calls[0][0]).not.toHaveProperty("checkCode");
    expect(onContinue).not.toHaveBeenCalled();
    expect(onBooked).not.toHaveBeenCalled();
    expect(openBookingPayment).toHaveBeenCalledWith("https://pay.example/1");
  });

  it("ignores token saved for another phone", async () => {
    saveAuthToken({
      token: "jwt-other",
      expiresAt: "2099-01-01T00:00:00Z",
      phone: "+7 (911) 000-00-00",
    });
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<Harness onContinue={onContinue} />);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Далее →" }));

    expect(onContinue).toHaveBeenCalled();
    expect(saveRoomBooking).not.toHaveBeenCalled();
  });

  it("drops rejected token and goes to verification", async () => {
    saveAuthToken({
      token: "jwt-revoked",
      expiresAt: "2099-01-01T00:00:00Z",
      phone: "+7 (900) 123-45-67",
    });
    saveRoomBooking.mockRejectedValueOnce(
      Object.assign(new Error("Unauthorized"), { status: 401 })
    );
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const onBooked = vi.fn();
    render(<Harness onContinue={onContinue} onBooked={onBooked} />);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Забронировать" }));

    await waitFor(() => {
      expect(onContinue).toHaveBeenCalled();
    });
    expect(onBooked).not.toHaveBeenCalled();
    expect(localStorage.getItem(BOOKING_AUTH_STORAGE_KEY)).toBeNull();
  });

  it("prefills phone and name for authorized client", async () => {
    saveAuthToken({
      token: "jwt-saved",
      expiresAt: "2099-01-01T00:00:00Z",
      phone: "+79001234567",
      firstName: "Иван",
      lastName: "Петров",
    });
    render(<Harness />);

    expect(screen.getByLabelText("Телефон")).toHaveValue("+7 (900) 123-45-67");
    expect(screen.getByLabelText("Имя")).toHaveValue("Иван");
    expect(screen.getByLabelText("Фамилия")).toHaveValue("Петров");
    expect(screen.queryByText(/Номер уже подтверждён/)).not.toBeInTheDocument();
  });

  it("has single required consent with offer link", async () => {
    render(<Harness />);
    expect(screen.queryByText(/конфиденциальности/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    expect(screen.getByRole("checkbox")).toBeRequired();
    expect(
      screen.getByText(/Я соглашаюсь с условиями/i)
    ).toBeInTheDocument();
  });

  it("shows verification channels when number is not confirmed", async () => {
    render(<Harness guestCount={1} />);
    await waitFor(() => {
      expect(screen.getByText("К оплате")).toBeInTheDocument();
    });
    expect(screen.getByText("Telegram")).toBeInTheDocument();
    expect(screen.getByLabelText("MAX")).toBeChecked();
    expect(screen.getByText("По телефону")).toBeInTheDocument();
    expect(screen.getByText("Оплата")).toBeInTheDocument();
    expect(screen.queryByText("Оплата с р/счета юр. лица")).not.toBeInTheDocument();
  });

  it("books a full payment when the guest pays by invoice", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<Harness onContinue={onContinue} invoicePayment />);

    await fillForm(user);
    await user.click(screen.getByLabelText("Оплата с р/счета юр. лица"));
    expect(screen.queryByLabelText("Сертификат")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Далее →" }));
    expect(onContinue).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Почта для отправки счёта")).toHaveClass(
      "booking-checkout__input--invalid"
    );
    await user.type(screen.getByLabelText("Почта для отправки счёта"), "buh@example.com");
    await user.click(screen.getByRole("button", { name: "Далее →" }));

    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMode: "full",
        payByInvoice: true,
        invoiceEmail: "buh@example.com",
      })
    );
  });

  it("checks a certificate, subtracts it, and opens the remaining payment link", async () => {
    saveAuthToken({
      token: "jwt-saved",
      expiresAt: "2099-01-01T00:00:00Z",
      phone: "+7 (900) 123-45-67",
    });
    checkBookingCertificate.mockResolvedValue({
      name: "Электронный сертификат",
      balance: 1000,
    });
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            paidFully: false,
            certificateUsed: 1000,
            remainingAmount: 2500,
            paymentLink: "https://pay.example/rest",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    const onBooked = vi.fn();
    render(<Harness onBooked={onBooked} />);

    await fillForm(user);
    await user.type(screen.getByLabelText("Сертификат"), "123456");
    expect(screen.getByRole("button", { name: "Забронировать" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Забронировать" }));
    expect(onBooked).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Сертификат")).toHaveClass(
      "booking-checkout__input--invalid"
    );
    await user.click(screen.getAllByRole("button", { name: "проверить" })[1]);

    expect(
      (await screen.findByText(/спишется/)).textContent?.replace(/\s/g, " ")
    ).toBe("Электронный сертификат: спишется 1 000 ₽, останется 0 ₽");
    expect(screen.getByText("Сертификат", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText(/−1[\s\u00a0]?000/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Забронировать" }));

    await waitFor(() => {
      expect(openBookingPayment).toHaveBeenCalledWith("https://pay.example/rest");
    });
    const payCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/pay-with-certificate")
    ) as [string, RequestInit] | undefined;
    expect(payCall).toBeTruthy();
    expect(JSON.parse(String(payCall?.[1].body))).toEqual({
      alias: "les",
      bookingId: "bk-1",
      certificateNumber: "123456",
    });
    expect(onBooked).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
