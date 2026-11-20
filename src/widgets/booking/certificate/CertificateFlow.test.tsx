import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CertificateFlow } from "./CertificateFlow";
import { saveCertificatePurchase } from "./certificateApi";
import type { SaleCertificate } from "./parseCertificates";

vi.mock("./certificateApi", async () => {
  const actual = await vi.importActual<typeof import("./certificateApi")>(
    "./certificateApi"
  );
  return {
    ...actual,
    saveCertificatePurchase: vi.fn(),
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

describe("CertificateFlow", () => {
  beforeEach(() => {
    save.mockReset();
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
});
