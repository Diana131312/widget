import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SaleCertificate } from "./parseCertificates";
import { StepCertificate } from "./StepCertificate";

const certificate: SaleCertificate = {
  id: "cert-1",
  name: "На отдых",
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

    const next = screen.getByRole("button", { name: "Далее" });
    expect(next).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /На отдых/ }));
    expect(next).toBeDisabled();

    await user.type(screen.getByLabelText(/Email/), "ivan@mail.ru");
    expect(next).toBeEnabled();

    await user.click(next);
    expect(onContinue).toHaveBeenCalledWith({
      certificateId: "cert-1",
      count: 1,
      recipientName: "",
      promoCode: "",
      email: "ivan@mail.ru",
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

    const check = screen.getByRole("button", { name: "Проверить" });
    expect(check).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /На отдых/ }));
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
          email: "",
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
          email: "",
        }}
        promoMessage="Такого промокода нет или он выключен"
      />
    );

    expect(screen.queryByRole("button", { name: "Проверить" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Промокод не подошёл")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Такого промокода нет");
  });
});
