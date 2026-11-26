import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAuthToken, saveAuthToken } from "../checkout/authToken";
import type { SaleCertificate } from "./parseCertificates";
import { StepCertificateBuyer } from "./StepCertificateBuyer";

const certificate: SaleCertificate = {
  id: "cert-1",
  name: "На отдых",
  description: "",
  price: 5000,
  durationMonths: 6,
  logo: null,
};

describe("StepCertificateBuyer", () => {
  afterEach(() => {
    clearAuthToken();
  });

  it("fills the buyer from the signed-in profile", () => {
    saveAuthToken({
      token: "jwt",
      expiresAt: "2099-01-01T00:00:00Z",
      phone: "79001234567",
      firstName: "Иван",
      lastName: "Петров",
    });
    render(
      <StepCertificateBuyer
        certificate={certificate}
        draft={{
          certificateId: certificate.id,
          count: 1,
          recipientName: "",
          promoCode: "",
        }}
        discountPercent={0}
      />
    );
    expect(screen.getByLabelText("Фамилия покупателя")).toHaveValue("Петров");
    expect(screen.getByLabelText("Имя покупателя")).toHaveValue("Иван");
    expect(screen.getByLabelText("Телефон покупателя")).toHaveValue(
      "+7 (900) 123-45-67"
    );
  });

  it("requires email before payment", async () => {
    const user = userEvent.setup();
    const onPay = vi.fn();
    render(
      <StepCertificateBuyer
        certificate={certificate}
        draft={{
          certificateId: certificate.id,
          count: 1,
          recipientName: "Анна",
          promoCode: "",
        }}
        discountPercent={0}
        onPay={onPay}
      />
    );

    const pay = screen.getByRole("button", { name: /Оплатить/ });
    expect(pay).toBeEnabled();
    await user.click(pay);
    expect(onPay).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Фамилия покупателя")).toHaveClass(
      "booking-checkout__input--invalid"
    );
    expect(screen.getByLabelText(/Почта для отправки сертификата/)).toHaveClass(
      "booking-checkout__input--invalid"
    );

    expect(screen.getByText("Срок сертификата")).toBeInTheDocument();
    expect(screen.getByText("не ограничен")).toBeInTheDocument();
    expect(screen.getByText(/1 шт/)).toBeInTheDocument();
    expect(screen.queryByText("Номинал")).not.toBeInTheDocument();
    expect(screen.queryByText("Как подтвердить номер")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Telegram" })).not.toBeInTheDocument();
    expect(screen.queryByText("Как с вами связаться")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Фамилия покупателя"), "Петров");
    await user.type(screen.getByLabelText("Имя покупателя"), "Иван");
    await user.type(screen.getByLabelText("Телефон покупателя"), "9001234567");
    await user.click(screen.getByRole("checkbox"));
    expect(pay).toBeEnabled();
    expect(screen.getByLabelText("Фамилия покупателя")).not.toHaveClass(
      "booking-checkout__input--invalid"
    );

    await user.type(
      screen.getByLabelText(/Почта для отправки сертификата/),
      "ivan@mail.ru"
    );
    expect(pay).toBeEnabled();

    await user.click(pay);
    expect(onPay).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Иван",
        lastName: "Петров",
        email: "ivan@mail.ru",
        messenger: "telegram",
        payByInvoice: false,
      })
    );
  });

  it("does not offer invoice payment for a certificate", () => {
    render(
      <StepCertificateBuyer
        certificate={certificate}
        draft={{
          certificateId: certificate.id,
          count: 1,
          recipientName: "",
          promoCode: "",
        }}
        discountPercent={0}
        showEmail={false}
      />
    );
    expect(screen.queryByRole("radio", { name: "Полная оплата" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: "Оплата с р/счета юр. лица" })
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Почта для отправки счёта")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Почта для отправки сертификата")
    ).not.toBeInTheDocument();
  });
});
