import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingWidget } from "../BookingWidget";
import { resetBookingUrlNavKey } from "../url/bookingUrl";
import {
  checkCertificatePromo,
  openCertificatePayment,
  saveCertificatePurchase,
} from "./certificateApi";
import { resetCertificateUrlKey } from "./certificateUrl";

const certificates = [
  {
    id: "e5",
    name: "Электронный сертификат 5000",
    price: 5000,
    durationMonths: null,
  },
  {
    id: "e10",
    name: "Электронный сертификат 10000",
    price: 10000,
    durationMonths: 6,
  },
  {
    id: "e20",
    name: "Электронный сертификат 20000",
    price: 20000,
    durationMonths: null,
  },
  {
    id: "p3",
    name: "Подарочный сертификат 3000",
    price: 3000,
    durationMonths: null,
  },
];

const getConfig = vi.fn(async () => ({
  settings: { tenantId: "11111111-1111-1111-1111-111111111111" },
  rooms: [],
  dailyRooms: [],
  certificates,
}));

vi.mock("../bootstrap/useBookingBootstrap", async () => {
  const actual = await vi.importActual<
    typeof import("../bootstrap/useBookingBootstrap")
  >("../bootstrap/useBookingBootstrap");
  return {
    ...actual,
    useBookingBootstrap: (args: { stepId: string }) =>
      actual.useBookingBootstrap({
        ...args,
        getConfig,
      } as never),
  };
});

vi.mock("./certificateApi", async () => {
  const actual = await vi.importActual<typeof import("./certificateApi")>(
    "./certificateApi"
  );
  return {
    ...actual,
    checkCertificatePromo: vi.fn(),
    openCertificatePayment: vi.fn(),
    saveCertificatePurchase: vi.fn(),
  };
});

const checkPromo = vi.mocked(checkCertificatePromo);
const openPayment = vi.mocked(openCertificatePayment);
const savePurchase = vi.mocked(saveCertificatePurchase);

async function openCertificateOnly() {
  window.history.replaceState({}, "", "/?cert_only");
  const view = render(<BookingWidget />);
  await screen.findByRole("tab", { name: "Электронный" });
  return view;
}

describe("certificate purchase scenarios", () => {
  beforeEach(() => {
    getConfig.mockClear();
    getConfig.mockImplementation(async () => ({
      settings: { tenantId: "11111111-1111-1111-1111-111111111111" },
      rooms: [],
      dailyRooms: [],
      certificates,
    }));
    checkPromo.mockReset();
    openPayment.mockReset();
    savePurchase.mockReset();
    resetBookingUrlNavKey();
    resetCertificateUrlKey();
    window.history.replaceState({}, "", "/");
  });

  it("opens only certificates on the standalone link and keeps that link after refresh", async () => {
    const view = await openCertificateOnly();

    expect(screen.getByText("Шаг 1 из 2")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Электронный" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.queryByRole("button", { name: "Назад" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Коттеджи" })).not.toBeInTheDocument();
    expect(screen.getByText("номинал от 1 000₽ до 99 000₽")).toBeInTheDocument();
    expect(screen.getByText("на почту придет сертификат")).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toHaveAttribute(
      "placeholder",
      "ivan@mail.ru"
    );
    expect(screen.getByLabelText("Промокод")).not.toHaveAttribute("placeholder");
    expect(screen.getByRole("button", { name: "проверить" })).toBeDisabled();

    const prices = [
      ...document.querySelectorAll(".booking-certificate__nominal-price"),
    ].map((node) => node.textContent ?? "");
    expect(prices.map((price) => price.replace(/\s/g, ""))).toEqual([
      "5000₽",
      "10000₽",
      "20000₽",
    ]);
    expect(
      document.querySelector(".booking-certificate__art--desktop")?.getAttribute("src")
    ).toContain("cert3");
    expect(
      document.querySelector(".booking-certificate__art--mobile")?.getAttribute("src")
    ).toContain("cert2");

    const search = window.location.search;
    view.unmount();
    window.history.replaceState({}, "", `/${search}`);
    resetBookingUrlNavKey();
    resetCertificateUrlKey();
    render(<BookingWidget />);

    expect(await screen.findByText("Шаг 1 из 2")).toBeInTheDocument();
    expect(screen.getAllByRole("tab", { name: "Электронный" })[0]).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(window.location.search).not.toContain("cert_only=");
  });

  it("opens certificates from the home card and returns to a cleared home", async () => {
    const user = userEvent.setup();
    render(<BookingWidget />);

    await user.click(
      await screen.findByRole("button", { name: "Подарочные сертификаты" })
    );

    expect(await screen.findByText("Шаг 2 из 3")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Бумажный" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Назад" }));

    expect(
      await screen.findByRole("button", { name: "Подарочные сертификаты" })
    ).toBeInTheDocument();
    expect(screen.getByText("Шаг 1 из 6")).toBeInTheDocument();
    expect(window.location.search).not.toContain("bk_cert=");
  });

  it("buys two electronic nominals and restores them from the address", async () => {
    const user = userEvent.setup();
    const view = await openCertificateOnly();
    await user.click(screen.getByRole("button", { name: /Добавить 10/ }));
    await user.click(screen.getByRole("button", { name: /Добавить 10/ }));
    await user.click(screen.getByRole("button", { name: /Добавить 20/ }));
    await user.type(screen.getByLabelText(/Email/), "ivan@mail.ru");
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(await screen.findByText("Шаг 2 из 2")).toBeInTheDocument();
    expect(screen.getAllByText("Сертификат")).toHaveLength(2);
    expect(screen.getByText(/2 шт/)).toBeInTheDocument();
    expect(screen.getByText(/1 шт/)).toBeInTheDocument();
    expect(screen.getByText("не ограничен")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Имя получателя")).not.toBeInTheDocument();
    expect(screen.queryByText("Как подтвердить номер")).not.toBeInTheDocument();
    expect(window.location.search).toContain("bk_cq=");
    expect(window.location.search).toContain("bk_cemail=");
    expect(window.location.search).not.toContain("cert_only=");

    const search = window.location.search;
    view.unmount();
    resetBookingUrlNavKey();
    resetCertificateUrlKey();
    window.history.replaceState({}, "", `/${search}`);
    render(<BookingWidget />);

    expect(await screen.findByText("Шаг 2 из 2")).toBeInTheDocument();
    expect(screen.getByText(/2 шт/)).toBeInTheDocument();
    expect(screen.queryByDisplayValue("ivan@mail.ru")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument();
  });

  it("marks a missing nominal and email, then continues once both are filled", async () => {
    const user = userEvent.setup();
    await openCertificateOnly();

    const next = screen.getByRole("button", { name: "Далее" });
    expect(next).toBeEnabled();
    await user.click(next);

    expect(screen.getByText("Выбор номинала")).toBeInTheDocument();
    expect(document.querySelector(".booking-certificate__nominals")).toHaveClass(
      "is-invalid"
    );
    expect(screen.getByLabelText(/Email/)).toHaveClass(
      "booking-checkout__input--invalid"
    );

    await user.click(screen.getByRole("button", { name: /Добавить 5/ }));
    expect(document.querySelector(".booking-certificate__nominals")).not.toHaveClass(
      "is-invalid"
    );
    expect(screen.getByLabelText(/Email/)).toHaveClass(
      "booking-checkout__input--invalid"
    );

    await user.type(screen.getByLabelText(/Email/), "ivan@mail.ru");
    expect(screen.getByLabelText(/Email/)).not.toHaveClass(
      "booking-checkout__input--invalid"
    );
    await user.click(next);
    expect(await screen.findByText("Шаг 2 из 2")).toBeInTheDocument();
  });

  it("keeps an incomplete email on the pick step", async () => {
    const user = userEvent.setup();
    await openCertificateOnly();
    await user.click(screen.getByRole("button", { name: /Добавить 5/ }));
    await user.type(screen.getByLabelText(/Email/), "ivan@");

    expect(screen.getByText("Укажите почту полностью")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Далее" }));
    expect(screen.getByLabelText(/Email/)).toHaveClass(
      "booking-checkout__input--invalid"
    );
    expect(screen.queryByText("Шаг 2 из 2")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/Email/), "mail.ru");
    await user.click(screen.getByRole("button", { name: "Далее" }));
    expect(await screen.findByText("Шаг 2 из 2")).toBeInTheDocument();
  });

  it("sells a paper certificate without asking for an email", async () => {
    const user = userEvent.setup();
    savePurchase.mockResolvedValue({
      amount: 0,
      paymentLink: null,
      paid: true,
    });
    await openCertificateOnly();

    await user.click(screen.getByRole("tab", { name: "Бумажный" }));
    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument();
    expect(screen.getByText("номинал 3000₽, 5000₽, 8000₽")).toBeInTheDocument();
    expect(
      screen.getByText("списание полной суммы номинала")
    ).toBeInTheDocument();
    expect(document.querySelector(".booking-certificate__art")?.getAttribute("src")).toContain(
      "cert"
    );

    await user.click(screen.getByRole("button", { name: "Далее" }));
    expect(document.querySelector(".booking-certificate__nominals")).toHaveClass(
      "is-invalid"
    );

    await user.click(screen.getByRole("button", { name: /Добавить 3/ }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    expect(await screen.findByText("Шаг 2 из 2")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Фамилия покупателя"), "Петров");
    await user.type(screen.getByLabelText("Имя покупателя"), "Иван");
    await user.type(screen.getByLabelText("Телефон покупателя"), "9001234567");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Оплатить/ }));

    await waitFor(() => expect(savePurchase).toHaveBeenCalled());
    expect(savePurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "les174.com@yandex.ru",
        recipientName: "",
        messenger: "telegram",
        name: "Иван Петров",
        phone: "+79001234567",
        certificates: [{ id: "p3", count: 1 }],
      })
    );
    expect(await screen.findByText("Заказ оплачен")).toBeInTheDocument();
    expect(
      screen.queryByText("Не получили ссылку на оплату")
    ).not.toBeInTheDocument();
  });

  it("does not mix paper and electronic quantities", async () => {
    const user = userEvent.setup();
    await openCertificateOnly();
    await user.click(screen.getByRole("button", { name: /Добавить 5/ }));
    await user.click(screen.getByRole("tab", { name: "Бумажный" }));
    await user.click(screen.getByRole("button", { name: /Добавить 3/ }));
    await user.click(screen.getByRole("tab", { name: "Электронный" }));

    expect(screen.getByRole("button", { name: /Добавить 5/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Добавить 3/ })).not.toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Бумажный" }));
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Добавить 5/ })).not.toBeInTheDocument();
  });

  it("stops at 20 copies of one nominal", async () => {
    window.history.replaceState(
      {},
      "",
      "/?cert_only&bk_cert=pick&bk_cformat=electronic&bk_cq=e10:25"
    );
    render(<BookingWidget />);

    const add = await screen.findByRole("button", { name: /Добавить 10/ });
    expect(add).toBeDisabled();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Убрать 10/ })).toBeEnabled();
  });

  it("rejects a promo code and still continues without sending it", async () => {
    const user = userEvent.setup();
    checkPromo.mockResolvedValue({
      discount: 0,
      reason: "not_found",
      certificateTypeIds: [],
      dateFrom: null,
      dateTo: null,
    });
    await openCertificateOnly();
    await user.click(screen.getByRole("button", { name: /Добавить 10/ }));
    await user.type(screen.getByLabelText("Промокод"), "NOPE");
    await user.click(screen.getByRole("button", { name: "проверить" }));

    expect(
      await screen.findByText("Такого промокода нет или он выключен")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Промокод не подошёл")).toBeInTheDocument();
    expect(screen.getByText("Выбор номинала")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Промокод"));
    await user.type(screen.getByLabelText(/Email/), "ivan@mail.ru");
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(await screen.findByRole("button", { name: /Оплатить 10\s000/ })).toBeInTheDocument();
    expect(screen.queryByText("NOPE")).not.toBeInTheDocument();
  });

  it("applies an accepted promo only to the payment amount", async () => {
    const user = userEvent.setup();
    checkPromo.mockResolvedValue({
      discount: 10,
      reason: "ok",
      certificateTypeIds: ["e10"],
      dateFrom: null,
      dateTo: null,
    });
    await openCertificateOnly();
    await user.click(screen.getByRole("button", { name: /Добавить 10/ }));
    await user.type(screen.getByLabelText("Промокод"), "SALE10");
    await user.click(screen.getByRole("button", { name: "проверить" }));

    expect(await screen.findByText("✓ 10%")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Email/), "ivan@mail.ru");
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(await screen.findByText(/1 шт/)).toHaveTextContent(/10\s000/);
    expect(screen.getByText("SALE10 10%")).toBeInTheDocument();
    expect(
      screen.getByText(/Скидка уменьшает только оплату/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Оплатить 9\s000/ })
    ).toBeInTheDocument();
  });

  it("stays on the pick step when the promo check cannot reach the server", async () => {
    const user = userEvent.setup();
    checkPromo.mockRejectedValue(new TypeError("Failed to fetch"));
    await openCertificateOnly();
    await user.click(screen.getByRole("button", { name: /Добавить 5/ }));
    await user.type(screen.getByLabelText("Промокод"), "SALE10");
    await user.type(screen.getByLabelText(/Email/), "ivan@mail.ru");
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(
      await screen.findByText("Проверьте интернет и попробуйте ещё раз")
    ).toBeInTheDocument();
    expect(screen.getByText("Выбор номинала")).toBeInTheDocument();
    expect(screen.queryByText("Шаг 2 из 2")).not.toBeInTheDocument();
  });

  it("enables payment only after the buyer fields are complete", async () => {
    const user = userEvent.setup();
    const view = await openCertificateOnly();
    await user.click(screen.getByRole("button", { name: /Добавить 10/ }));
    await user.type(screen.getByLabelText(/Email/), "ivan@mail.ru");
    await user.click(screen.getByRole("button", { name: "Далее" }));

    const pay = await screen.findByRole("button", { name: /Оплатить 10\s000/ });
    expect(pay).toBeDisabled();

    await user.type(screen.getByLabelText("Имя покупателя"), "Иван");
    expect(pay).toBeDisabled();
    await user.type(screen.getByLabelText("Телефон покупателя"), "900");
    expect(screen.getByText("Укажите полный номер")).toBeInTheDocument();
    expect(screen.getByLabelText("Телефон покупателя")).toHaveValue("+7 (900)");

    await user.type(screen.getByLabelText("Телефон покупателя"), "1234567");
    expect(screen.getByLabelText("Телефон покупателя")).toHaveValue(
      "+7 (900) 123-45-67"
    );
    await user.click(
      screen.getByRole("button", { name: "бронирования услуг" })
    );
    expect(
      screen.getByRole("dialog", { name: "Условия предоставления услуг" })
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Закрыть" }));
    expect(pay).toBeDisabled();

    await user.type(screen.getByLabelText("Фамилия покупателя"), "Петров");
    await user.click(screen.getByRole("checkbox"));
    expect(pay).toBeEnabled();

    const search = window.location.search;
    view.unmount();
    resetBookingUrlNavKey();
    resetCertificateUrlKey();
    window.history.replaceState({}, "", `/${search}`);
    render(<BookingWidget />);

    expect(await screen.findByDisplayValue("Петров")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Иван")).toBeInTheDocument();
    expect(screen.getByDisplayValue("+7 (900) 123-45-67")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("returns to the same pick step with the browser back button", async () => {
    const user = userEvent.setup();
    await openCertificateOnly();
    await user.click(screen.getByRole("button", { name: /Добавить 5/ }));
    await user.type(screen.getByLabelText(/Email/), "ivan@mail.ru");
    await user.click(screen.getByRole("button", { name: "Далее" }));
    expect(await screen.findByText("Шаг 2 из 2")).toBeInTheDocument();

    window.history.back();
    await waitFor(() => {
      expect(screen.getByText("Выбор номинала")).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/Email/)).toHaveValue("ivan@mail.ru");
    expect(screen.getByText("1")).toBeInTheDocument();

    window.history.forward();
    expect(await screen.findByText("Шаг 2 из 2")).toBeInTheDocument();
    expect(screen.getByText(/1 шт/)).toBeInTheDocument();
  });

  it("shows a missing payment link and a server error without leaving the buyer step", async () => {
    const user = userEvent.setup();
    savePurchase.mockResolvedValueOnce({
      amount: 5000,
      paymentLink: null,
      paid: false,
    });
    await openCertificateOnly();
    await user.click(screen.getByRole("button", { name: /Добавить 5/ }));
    await user.type(screen.getByLabelText(/Email/), "ivan@mail.ru");
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.type(await screen.findByLabelText("Фамилия покупателя"), "Петров");
    await user.type(screen.getByLabelText("Имя покупателя"), "Иван");
    await user.type(screen.getByLabelText("Телефон покупателя"), "9001234567");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Оплатить/ }));

    expect(
      await screen.findByText("Не получили ссылку на оплату")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Фамилия покупателя")).toBeInTheDocument();

    savePurchase.mockRejectedValueOnce(new Error("Сервер занят"));
    await user.click(screen.getByRole("button", { name: /Оплатить/ }));
    expect(await screen.findByText("Сервер занят")).toBeInTheDocument();
    expect(screen.getByLabelText("Фамилия покупателя")).toBeInTheDocument();
  });

  it("follows the payment link and keeps the certificate lines from cq", async () => {
    savePurchase.mockResolvedValue({
      amount: 30000,
      paymentLink: "https://pay.example/cert",
      paid: false,
    });
    window.history.replaceState(
      {},
      "",
      "/?cert_only&bk_cert=buyer&bk_cformat=electronic&bk_cid=e20&bk_ccount=9&bk_cq=e10%3A2%2Ce20%3A1&bk_cemail=ivan%40mail.ru"
    );
    render(<BookingWidget />);

    expect(await screen.findByText(/2 шт/)).toBeInTheDocument();
    expect(screen.getByText(/1 шт/)).toBeInTheDocument();
    expect(screen.queryByText(/9 шт/)).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Фамилия покупателя"), "Петров");
    await user.type(screen.getByLabelText("Имя покупателя"), "Иван");
    await user.type(screen.getByLabelText("Телефон покупателя"), "9001234567");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Оплатить/ }));

    await waitFor(() =>
      expect(openPayment).toHaveBeenCalledWith("https://pay.example/cert")
    );
    expect(savePurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ivan@mail.ru",
        recipientName: "",
        messenger: "telegram",
        certificates: [
          { id: "e10", count: 2 },
          { id: "e20", count: 1 },
        ],
      })
    );
  });

  it("opens the pick step from a buyer link that has no certificate", async () => {
    window.history.replaceState({}, "", "/?cert_only&bk_cert=buyer");
    render(<BookingWidget />);

    expect(await screen.findByText("Выбор номинала")).toBeInTheDocument();
    expect(screen.queryByLabelText("Фамилия покупателя")).not.toBeInTheDocument();
  });

  it("explains an empty catalog and a failed catalog load", async () => {
    getConfig.mockResolvedValueOnce({
      settings: { tenantId: "11111111-1111-1111-1111-111111111111" },
      rooms: [],
      dailyRooms: [],
      certificates: [],
    });
    window.history.replaceState({}, "", "/?cert_only");
    const first = render(<BookingWidget />);
    expect(
      await screen.findByText(
        "Подарочные сертификаты сейчас недоступны для покупки онлайн."
      )
    ).toBeInTheDocument();
    first.unmount();

    getConfig.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    resetBookingUrlNavKey();
    resetCertificateUrlKey();
    window.history.replaceState({}, "", "/?cert_only");
    render(<BookingWidget />);
    expect(
      await screen.findByRole("heading", { name: "Не удалось загрузить данные" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Попробовать снова" })
    ).toBeInTheDocument();
  });
});
