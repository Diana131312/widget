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

  it("does not ask for a promo code while choosing a nominal", () => {
    render(
      <StepCertificate
        certificates={[certificate]}
        tenantId={null}
        format="paper"
      />
    );
    expect(screen.queryByLabelText("Промокод")).not.toBeInTheDocument();
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
    expect(screen.queryByLabelText("Почта для отправки сертификата")).not.toBeInTheDocument();
  });

  it("does not ask for email on the pick step", () => {
    render(
      <StepCertificate
        tenantId={null}
        format="paper"
        certificates={[certificate]}
      />
    );
    expect(screen.queryByLabelText("Почта для отправки сертификата")).not.toBeInTheDocument();
  });

  it("continues without an email once a nominal is chosen", async () => {
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
    expect(screen.queryByLabelText("Почта для отправки сертификата")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Далее" }));
    expect(onContinue).toHaveBeenCalled();
  });
});
