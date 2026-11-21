import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StepCategory } from "../steps/StepCategory";

describe("StepCategory", () => {
  it("shows cottages, baths, and gift certificates", () => {
    render(<StepCategory onSelect={vi.fn()} onSelectCertificate={vi.fn()} />);

    expect(
      screen.getByRole("region", { name: "Выбор категории" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Коттеджи" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Бани на дровах" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Подарочные сертификаты" })
    ).toBeInTheDocument();
  });
});
