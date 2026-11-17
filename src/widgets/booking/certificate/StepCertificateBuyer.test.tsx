import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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
          email: "",
        }}
        discountPercent={0}
        onPay={onPay}
      />
    );

    const pay = screen.getByRole("button", { name: /Оплатить/ });
    expect(pay).toBeDisabled();

    expect(screen.getByText("Срок сертификата")).toBeInTheDocument();
    expect(screen.getByText(/1 шт/)).toBeInTheDocument();
    expect(screen.queryByText("Номинал")).not.toBeInTheDocument();
    expect(screen.getByText("Как с вами связаться")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Фамилия покупателя"), "Петров");
    await user.type(screen.getByLabelText("Имя покупателя"), "Иван");
    await user.type(screen.getByLabelText("Телефон покупателя"), "9001234567");
    await user.click(screen.getByRole("checkbox"));
    expect(pay).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: "Telegram" }));
    expect(pay).toBeEnabled();

    await user.click(pay);
    expect(onPay).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Иван",
        lastName: "Петров",
        messenger: "telegram",
      })
    );
  });
});
