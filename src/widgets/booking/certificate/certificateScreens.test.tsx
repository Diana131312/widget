import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CertificateFlow } from "./CertificateFlow";
import type { SaleCertificate } from "./parseCertificates";
import {
  EMPTY_CERTIFICATE_URL,
  type CertificateUrlState,
} from "./certificateUrl";

vi.mock("./certificateApi", async () => {
  const actual = await vi.importActual<typeof import("./certificateApi")>(
    "./certificateApi"
  );
  return {
    ...actual,
    saveCertificatePurchase: vi.fn(),
    checkCertificatePromo: vi.fn(),
  };
});

const electronic: SaleCertificate = {
  id: "electronic",
  name: "Электронный сертификат",
  description: "",
  price: 5000,
  durationMonths: null,
  logo: null,
};

const paper: SaleCertificate = {
  id: "paper",
  name: "Подарочный сертификат",
  description: "",
  price: 3000,
  durationMonths: 6,
  logo: null,
};

function Host({ format }: { format: "electronic" | "paper" }) {
  const [state, setState] = useState<CertificateUrlState>({
    ...EMPTY_CERTIFICATE_URL,
    phase: "pick",
    format,
  });
  return (
    <CertificateFlow
      state={state}
      restoreKey={0}
      certificates={[electronic, paper]}
      catalogStatus="ready"
      tenantId={null}
      onChange={(patch) => setState((prev) => ({ ...prev, ...patch }))}
      onPickContinue={() => setState((prev) => ({ ...prev, phase: "buyer" }))}
    />
  );
}

describe("certificate screens stay mounted", () => {
  it("highlights an empty electronic order and then opens the buyer summary", async () => {
    const user = userEvent.setup();
    render(<Host format="electronic" />);

    await user.click(screen.getByRole("button", { name: "Далее" }));
    expect(screen.getByText("Выбор номинала")).toBeInTheDocument();
    expect(document.querySelector(".booking-certificate__nominals")).toHaveClass(
      "is-invalid"
    );
    expect(screen.queryByLabelText("Почта для отправки сертификата")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Добавить 5/ }));
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(screen.getByText("Срок сертификата")).toBeInTheDocument();
    expect(screen.getByText("не ограничен")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Оплатить/ })).toBeInTheDocument();
  });

  it("opens the buyer summary for a paper certificate without an email", async () => {
    const user = userEvent.setup();
    render(<Host format="paper" />);

    expect(screen.queryByLabelText("Почта для отправки сертификата")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Добавить 3/ }));
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(screen.getByText("Срок сертификата")).toBeInTheDocument();
    expect(screen.getByText("не ограничен")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Оплатить/ })).toBeInTheDocument();
  });
});
