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
        format="paper"
        onContinue={onContinue}
      />
    );

    const next = screen.getByRole("button", { name: "Далее" });
    expect(next).toBeEnabled();

    await user.click(next);
    expect(onContinue).not.toHaveBeenCalled();
    expect(document.querySelector(".booking-certificate__nominals")).toHaveClass(
      "is-invalid"
    );

    await user.click(screen.getByRole("button", { name: /Добавить 3/ }));
    expect(document.querySelector(".booking-certificate__nominals")).not.toHaveClass(
      "is-invalid"
    );

    await user.click(next);
    expect(onContinue).toHaveBeenCalledWith({
      certificateId: "cert-1",
      count: 1,
      recipientName: "",
      promoCode: "",
      lines: [{ id: "cert-1", count: 1 }],
    });
  });

  it("keeps a separate quantity for each nominal", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <StepCertificate
        certificates={[
          certificate,
          { ...certificate, id: "cert-2", price: 10000 },
        ]}
        tenantId={null}
        format="paper"
        onContinue={onContinue}
      />
    );

    await user.click(screen.getByRole("button", { name: /Добавить 3/ }));
    await user.click(screen.getByRole("button", { name: /Добавить 3/ }));
    await user.click(screen.getByRole("button", { name: /Добавить 10/ }));
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          { id: "cert-1", count: 2 },
          { id: "cert-2", count: 1 },
        ],
      })
    );
  });

  it("checks a promo code from the button next to the field", async () => {
    const user = userEvent.setup();
    const onCheckPromo = vi.fn();
    render(
      <StepCertificate
        certificates={[certificate]}
        tenantId={null}
        format="paper"
        onCheckPromo={onCheckPromo}
      />
    );

    await user.click(screen.getByRole("button", { name: /Добавить 3/ }));
    const check = screen.getByRole("button", { name: "проверить" });
    expect(check).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "Промокод" }), "SALE10");
    expect(check).toBeEnabled();

    await user.click(check);
    expect(onCheckPromo).toHaveBeenCalledWith("SALE10", ["cert-1"]);
  });

  it("shows the discount instead of the check button after a successful promo", () => {
    render(
      <StepCertificate
        certificates={[certificate]}
        tenantId={null}
        format="paper"
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
        format="paper"
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

  it("shows only the certificates of the chosen format", () => {
    render(
      <StepCertificate
        tenantId={null}
        format="electronic"
        certificates={[
          certificate,
          {
            ...certificate,
            id: "mail",
            name: "Электронный сертификат",
            price: 10000,
          },
        ]}
      />
    );

    expect(screen.getByText(/10\s000\s₽/)).toBeInTheDocument();
    expect(screen.queryByText(/3\s000\s₽/)).not.toBeInTheDocument();
    expect(screen.queryByText("Имя получателя")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
  });

  it("asks for email only on an electronic certificate", () => {
    render(
      <StepCertificate
        tenantId={null}
        format="paper"
        certificates={[certificate]}
      />
    );
    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument();
  });

  it("leaves next enabled without an email and marks the empty field", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const electronic = {
      ...certificate,
      id: "mail",
      name: "Электронный сертификат",
    };
    render(
      <StepCertificate
        certificates={[electronic]}
        tenantId={null}
        format="electronic"
        onContinue={onContinue}
      />
    );

    await user.click(screen.getByRole("button", { name: /Добавить 3/ }));
    const next = screen.getByRole("button", { name: "Далее" });
    const email = screen.getByLabelText(/Email/);
    expect(next).toBeEnabled();
    expect(email).not.toHaveClass("booking-checkout__input--invalid");

    await user.click(next);
    expect(onContinue).not.toHaveBeenCalled();
    expect(email).toHaveClass("booking-checkout__input--invalid");

    await user.type(email, "ivan@mail.ru");
    expect(email).not.toHaveClass("booking-checkout__input--invalid");
    await user.click(next);
    expect(onContinue).toHaveBeenCalled();
  });
});
