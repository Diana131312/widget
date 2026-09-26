import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StepCategory } from "../steps/StepCategory";

describe("StepCategory", () => {
  it("renders both category cards", () => {
    render(<StepCategory onSelect={vi.fn()} />);

    expect(
      screen.getByRole("region", { name: "Выбор категории" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Коттеджи" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Бани на дровах" })
    ).toBeInTheDocument();
  });

  it("calls onSelect with homes", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<StepCategory onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "Коттеджи" }));
    expect(onSelect).toHaveBeenCalledWith("homes");
  });

  it("calls onSelect with banya", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<StepCategory onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "Бани на дровах" }));
    expect(onSelect).toHaveBeenCalledWith("banya");
  });
});
