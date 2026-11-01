import { describe, expect, it } from "vitest";
import {
  BOOKING_CATEGORIES,
  getCategoryConfig,
  isCategoryHidden,
  VISIBLE_BOOKING_CATEGORIES,
} from "./categories";

describe("BOOKING_CATEGORIES", () => {
  it("contains homes and banya", () => {
    expect(BOOKING_CATEGORIES.map((c) => c.id)).toEqual(["homes", "banya"]);
  });

  it("getCategoryConfig returns caption and title", () => {
    expect(getCategoryConfig("homes")).toMatchObject({
      caption: "Коттеджи",
      title: "Дома",
    });
    expect(getCategoryConfig("banya")).toMatchObject({
      caption: "Бани на дровах",
      title: "Бани",
    });
  });

  it("temporarily hides homes", () => {
    expect(isCategoryHidden("homes")).toBe(true);
    expect(isCategoryHidden("banya")).toBe(false);
    expect(VISIBLE_BOOKING_CATEGORIES.map((c) => c.id)).toEqual(["banya"]);
  });
});
