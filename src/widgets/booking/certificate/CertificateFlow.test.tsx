import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CertificateFlow } from "./CertificateFlow";
import {
  openCertificatePayment,
  saveCertificatePurchase,
} from "./certificateApi";
import type { SaleCertificate } from "./parseCertificates";

vi.mock("./certificateApi", async () => {
  const actual = await vi.importActual<typeof import("./certificateApi")>(
    "./certificateApi"
  );
  return {
    ...actual,
    saveCertificatePurchase: vi.fn(),
    openCertificatePayment: vi.fn(),
  };
});

const certificate: SaleCertificate = {
  id: "cert-1",
  name: "Электронный сертификат",
  description: "",
  price: 5000,
  durationMonths: null,
  logo: null,
};

const save = vi.mocked(saveCertificatePurchase);
const openPayment = vi.mocked(openCertificatePayment);

describe("CertificateFlow", () => {
  beforeEach(() => {
    save.mockReset();
    openPayment.mockReset();
  });

  it("opens the paid page when the order is paid and there is no payment link", async () => {
    const user = userEvent.setup();
    save.mockResolvedValue({
      amount: 0,
      paymentLink: null,
      paid: true,
    } as never);

    render(
      <CertificateFlow
        state={{
          phase: "buyer",
          certificateId: certificate.id,
          count: 1,
          recipientName: "",
          promoCode: "",
          lastName: "",
          firstName: "",
          phone: "",
          email: "ivan@mail.ru",
          messenger: "telegram",
          termsAccepted: false,
          format: "electronic",
        }}
        restoreKey={0}
        certificates={[certificate]}
        catalogStatus="ready"
        tenantId={null}
        onChange={() => {}}
        onPickContinue={() => {}}
      />
    );

    await user.type(screen.getByLabelText("Фамилия покупателя"), "Петров");
    await user.type(screen.getByLabelText("Имя покупателя"), "Иван");
    await user.type(screen.getByLabelText("Телефон покупателя"), "9001234567");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Оплатить/ }));

    expect(await screen.findByText("Заказ оплачен")).toBeInTheDocument();
    expect(screen.queryByText("Не получили ссылку на оплату")).not.toBeInTheDocument();
  });

  it("pays a certificate by the payment link and hides invoice payment", async () => {
    const user = userEvent.setup();
    save.mockResolvedValue({
      amount: 5000,
      paymentLink: "https://pay.example/cert",
      bookingId: "bk-cert",
    } as never);

    render(
      <CertificateFlow
        state={{
          phase: "buyer",
          certificateId: certificate.id,
          count: 1,
          recipientName: "",
          promoCode: "",
          lastName: "Петров",
          firstName: "Иван",
          phone: "+7 (900) 123-45-67",
          email: "ivan@mail.ru",
          messenger: "telegram",
          termsAccepted: true,
          format: "electronic",
        }}
        restoreKey={0}
        certificates={[certificate]}
        catalogStatus="ready"
        tenantId={null}
        onChange={() => {}}
        onPickContinue={() => {}}
      />
    );

    expect(screen.queryByRole("radio", { name: "Полная оплата" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: "Оплата с р/счета юр. лица" })
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Почта для отправки счёта")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Оплатить/ }));

    await vi.waitFor(() => {
      expect(openPayment).toHaveBeenCalledWith("https://pay.example/cert");
    });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ivan@mail.ru" })
    );
    expect(screen.queryByText("Ожидание выставления счёта")).not.toBeInTheDocument();
  });

  it("saves a paper certificate to the office email and opens the payment link", async () => {
    const user = userEvent.setup();
    const paper = { ...certificate, id: "paper-1", name: "Подарочный сертификат" };
    save.mockResolvedValue({
      amount: 5000,
      paymentLink: "https://pay.example/paper",
    } as never);

    render(
      <CertificateFlow
        state={{
          phase: "buyer",
          certificateId: paper.id,
          count: 1,
          recipientName: "",
          promoCode: "",
          lastName: "Петров",
          firstName: "Иван",
          phone: "+7 (900) 123-45-67",
          email: "",
          messenger: "",
          termsAccepted: true,
          format: "paper",
        }}
        restoreKey={0}
        certificates={[paper]}
        catalogStatus="ready"
        tenantId={null}
        onChange={() => {}}
        onPickContinue={() => {}}
      />
    );

    expect(
      screen.queryByLabelText("Почта для отправки сертификата")
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Оплатить/ }));

    await vi.waitFor(() => {
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ email: "les174.com@yandex.ru" })
      );
    });
    expect(openPayment).toHaveBeenCalledWith("https://pay.example/paper");
  });
});
