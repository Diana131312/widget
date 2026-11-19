import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SaleCertificate } from "./parseCertificates";
import { StepCertificate } from "./StepCertificate";

const certificate: SaleCertificate = {
  id: "cert-1",
  name: "Подарочный сертификат",
  description: "Любые услуги",
  price: 3000,
  durationMonths: null,
  logo: null,
};

describe("StepCertificate", () => {
  it("continues once a certificate is chosen, without a recipient name", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <StepCertificate
        certificates={[certificate]}
        tenantId={null}
        onContinue={onContinue}
      />
    );

    await user.click(screen.getByRole("tab", { name: "Бумажный" }));
    const next = screen.getByRole("button", { name: "Далее" });
    expect(next).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Подарочный сертификат/ }));
    expect(next).toBeEnabled();

    await user.click(next);
    expect(onContinue).toHaveBeenCalledWith({
      certificateId: "cert-1",
      count: 1,
      recipientName: "",
      promoCode: "",
    });
  });

  it("checks a promo code from the button next to the field", async () => {
    const user = userEvent.setup();
    const onCheckPromo = vi.fn();
    render(
      <StepCertificate
        certificates={[certificate]}
        tenantId={null}
        onCheckPromo={onCheckPromo}
      />
    );

    await user.click(screen.getByRole("tab", { name: "Бумажный" }));
    await user.click(screen.getByRole("button", { name: /Подарочный сертификат/ }));
    const check = screen.getByRole("button", { name: "Проверить" });
    expect(check).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "Промокод" }), "SALE10");
    expect(check).toBeEnabled();

    await user.click(check);
    expect(onCheckPromo).toHaveBeenCalledWith("SALE10", "cert-1");
  });

  it("shows the discount instead of the check button after a successful promo", () => {
    render(
      <StepCertificate
        certificates={[certificate]}
        tenantId={null}
        initial={{
          certificateId: certificate.id,
          count: 1,
          recipientName: "",
          promoCode: "SALE10",
          format: "paper",
        }}
        promoDiscount={10}
      />
    );

    expect(screen.queryByRole("button", { name: "Проверить" })).not.toBeInTheDocument();
    expect(screen.getByText("✓ 10%")).toBeInTheDocument();
  });

  it("shows a cross and the error when the promo is rejected", () => {
    render(
      <StepCertificate
        certificates={[certificate]}
        tenantId={null}
        initial={{
          certificateId: certificate.id,
          count: 1,
          recipientName: "",
          promoCode: "NOPE",
          format: "paper",
        }}
        promoMessage="Такого промокода нет или он выключен"
      />
    );

    expect(screen.queryByRole("button", { name: "Проверить" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Промокод не подошёл")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Такого промокода нет");
  });

  it("filters certificates by the chosen tab and shows its terms", async () => {
    const user = userEvent.setup();
    render(
      <StepCertificate
        tenantId={null}
        certificates={[
          { ...certificate, id: "other", name: "На отдых" },
          certificate,
          {
            ...certificate,
            id: "mail",
            name: "Электронный сертификат",
          },
        ]}
      />
    );

    expect(screen.getByRole("tab", { name: "Электронный" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(
      screen.getByRole("button", { name: "Добавить Электронный сертификат" })
    ).toBeInTheDocument();
    expect(screen.getByText("Придёт на почту после оплаты")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Бумажный" }));
    expect(screen.getByText("Частичная оплата недоступна")).toBeInTheDocument();
    expect(screen.queryByText(/свяжется администратор/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Добавить Подарочный сертификат" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Добавить Электронный сертификат" })
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Имя получателя")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Электронный" }));
    expect(screen.getByText("Можно оплатить часть суммы")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Добавить Электронный сертификат" })
    ).toBeInTheDocument();
    expect(screen.getByText("Имя получателя")).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
  });
});
