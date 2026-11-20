import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StepCategory } from "../steps/StepCategory";

describe("StepCategory", () => {
  it("shows only gift certificates while homes and banya are hidden", () => {
    render(<StepCategory onSelect={vi.fn()} onSelectCertificate={vi.fn()} />);

    expect(
      screen.getByRole("region", { name: "Выбор категории" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Подарочные сертификаты" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Коттеджи" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Бани на дровах" })
    ).not.toBeInTheDocument();
  });
});
