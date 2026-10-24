import { describe, expect, it } from "vitest";
import type { WidgetGetResponse } from "../../../api";
import { groupProductsForRoom } from "./groupProducts";

const config = {
  productGroups: [
    { id: "g1", name: "Веники", image: null },
    { id: "g2", name: "Подарки", image: "img-group" },
  ],
  products: [
    {
      id: "p1",
      name: "Берёзовый",
      description: "Классика",
      barcode: null,
      image: null,
      price: 500,
      productGroupId: "g1",
      isPublic: true,
      roomIds: ["r1"],
      dailyRoomIds: [],
    },
    {
      id: "p2",
      name: "Дополнительный гость",
      description: "",
      barcode: null,
      image: null,
      price: 700,
      productGroupId: "g1",
      isPublic: true,
      roomIds: ["r1"],
      dailyRoomIds: [],
    },
    {
      id: "p3",
      name: "Чай",
      description: "",
      barcode: null,
      image: null,
      price: 200,
      productGroupId: null,
      isPublic: true,
      roomIds: [],
      dailyRoomIds: [],
    },
    {
      id: "p4",
      name: "Скрытый",
      description: "",
      barcode: null,
      image: null,
      price: 1,
      productGroupId: "g1",
      isPublic: false,
      roomIds: ["r1"],
      dailyRoomIds: [],
    },
    {
      id: "p5",
      name: "Другая баня",
      description: "",
      barcode: null,
      image: null,
      price: 100,
      productGroupId: "g2",
      isPublic: true,
      roomIds: ["r2"],
      dailyRoomIds: [],
    },
  ],
} as unknown as WidgetGetResponse;

describe("groupProductsForRoom", () => {
  it("filters by room and drops catalog extra-guest products", () => {
    const result = groupProductsForRoom(config, "banya", "r1");

    const sectionIds = result.groups.flatMap((g) =>
      g.products.map((p) => p.id)
    );
    expect(sectionIds).toContain("p1");
    expect(sectionIds).toContain("p3");
    expect(sectionIds).not.toContain("p2");
    expect(sectionIds).not.toContain("p4");
    expect(sectionIds).not.toContain("p5");
    expect(result.productsById.has("p2")).toBe(false);

    const other = result.groups.find((g) => g.group.name === "Другое");
    expect(other?.products.map((p) => p.id)).toEqual(["p3"]);
  });

  it("keeps productGroups order from API, not alphabetical", () => {
    const ordered = {
      productGroups: [
        { id: "g-z", name: "Ягоды", image: null },
        { id: "g-a", name: "Ароматы", image: null },
      ],
      products: [
        {
          id: "pz",
          name: "Малина",
          description: "",
          barcode: null,
          image: null,
          price: 100,
          productGroupId: "g-z",
          isPublic: true,
          roomIds: ["r1"],
          dailyRoomIds: [],
        },
        {
          id: "pa",
          name: "Мята",
          description: "",
          barcode: null,
          image: null,
          price: 200,
          productGroupId: "g-a",
          isPublic: true,
          roomIds: ["r1"],
          dailyRoomIds: [],
        },
      ],
    } as unknown as WidgetGetResponse;

    const result = groupProductsForRoom(ordered, "banya", "r1");
    expect(result.groups.map((g) => g.group.id)).toEqual(["g-z", "g-a"]);
  });

  it("filters homes by dailyRoomIds when array present", () => {
    const homesConfig = {
      productGroups: [{ id: "g1", name: "Допы", image: null }],
      products: [
        {
          id: "h1",
          name: "Завтрак",
          description: "",
          barcode: null,
          image: null,
          price: 900,
          productGroupId: "g1",
          isPublic: true,
          roomIds: [],
          dailyRoomIds: ["d1"],
        },
        {
          id: "h2",
          name: "Ужин",
          description: "",
          barcode: null,
          image: null,
          price: 1200,
          productGroupId: "g1",
          isPublic: true,
          roomIds: [],
          dailyRoomIds: ["d2"],
        },
      ],
    } as unknown as WidgetGetResponse;

    const result = groupProductsForRoom(homesConfig, "homes", "d1");
    expect(result.groups.flatMap((g) => g.products.map((p) => p.id))).toEqual([
      "h1",
    ]);
  });
});
