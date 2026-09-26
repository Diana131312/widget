import { describe, expect, it } from "vitest";
import { stepNeedsConfig } from "./stepRequirements";

describe("stepNeedsConfig", () => {
  it("category does not require config", () => {
    expect(stepNeedsConfig("category")).toBe(false);
  });

  it("later steps require config by default", () => {
    expect(stepNeedsConfig("object")).toBe(true);
    expect(stepNeedsConfig("setup")).toBe(true);
  });
});
