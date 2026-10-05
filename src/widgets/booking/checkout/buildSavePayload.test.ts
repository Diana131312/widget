import { describe, expect, it } from "vitest";
import type { WidgetGetResponse } from "../../../api";
import {
  buildCheckoutProducts,
  buildSaveBodies,
} from "./buildSavePayload";

const config = {
  products: [
    {
      id: "p1",
      name: "Веник",
      price: 500,
      isPublic: true,
      productGroupId: "g1",
      roomIds: ["b1"],
      dailyRoomIds: [],
      description: "",
      barcode: null,
      image: null,
    },
  ],
} as unknown as WidgetGetResponse;

describe("buildCheckoutProducts", () => {
  it("maps quantities to save items", () => {
    expect(buildCheckoutProducts(config, { p1: 2, missing: 1 })).toEqual([
      { id: "p1", name: "Веник", price: 500, count: 2 },
    ]);
  });
});

describe("buildSaveBodies", () => {
  const contact = {
    firstName: "Иван",
    lastName: "Петров",
    phone: "+7 (900) 123-45-67",
    comment: "Окно",
    verifyChannel: "telegram" as const,
  };

  it("builds homes dailySave body without extras", () => {
    const result = buildSaveBodies(
      {
        categoryId: "homes",
        roomId: "d1",
        guestCount: 3,
        productQuantities: { p1: 1 },
        total: 10500,
        checkIn: "2026-10-10",
        checkOut: "2026-10-12",
        banyaDate: null,
        banyaTimeFrom: null,
        banyaTimeTo: null,
        slotDuration: null,
      },
      contact,
      [{ id: "p1", name: "Веник", price: 500, count: 1 }]
    );
    expect(result).toEqual({
      kind: "homes",
      body: {
        dailyRoomId: "d1",
        checkInDate: "2026-10-10",
        checkOutDate: "2026-10-12",
        personCount: 3,
        name: "Иван",
        lastName: "Петров",
        phone: "+79001234567",
        messenger: "telegram",
        comment: "Окно",
        products: [{ id: "p1", name: "Веник", price: 500, count: 1 }],
      },
    });
  });

  it("builds banya save body per widget API", () => {
    const result = buildSaveBodies(
      {
        categoryId: "banya",
        roomId: "b1",
        guestCount: 4,
        productQuantities: {},
        total: 6000,
        checkIn: null,
        checkOut: null,
        banyaDate: "2026-10-05",
        banyaTimeFrom: "18:00",
        banyaTimeTo: "21:00",
        slotDuration: 3,
      },
      contact,
      [],
      "1234"
    );

    expect(result).toEqual({
      kind: "banya",
      body: {
        roomId: "b1",
        date: "2026-10-05",
        time: "18:00:00",
        duration: 3,
        personCount: 4,
        name: "Иван",
        lastName: "Петров",
        phone: "+79001234567",
        messenger: "telegram",
        comment: "Окно",
        promoCode: null,
        discounts: [],
        products: [],
        checkCode: "1234",
      },
    });
  });

  it("sends messenger null for call channel", () => {
    const result = buildSaveBodies(
      {
        categoryId: "banya",
        roomId: "b1",
        guestCount: 1,
        productQuantities: {},
        total: 3000,
        checkIn: null,
        checkOut: null,
        banyaDate: "2026-10-05",
        banyaTimeFrom: "12:00",
        banyaTimeTo: "15:00",
        slotDuration: 3,
      },
      { ...contact, verifyChannel: "call" },
      []
    );
    expect(result.kind).toBe("banya");
    if (result.kind === "banya") {
      expect(result.body.messenger).toBeNull();
      expect(result.body.products).toEqual([]);
      expect("price" in result.body).toBe(false);
      expect("periodProducts" in result.body).toBe(false);
      expect("personName" in result.body).toBe(false);
    }
  });

  it("rejects incomplete banya draft", () => {
    const result = buildSaveBodies(
      {
        categoryId: "banya",
        roomId: "b1",
        guestCount: 1,
        productQuantities: {},
        total: 1000,
        checkIn: null,
        checkOut: null,
        banyaDate: null,
        banyaTimeFrom: null,
        banyaTimeTo: null,
        slotDuration: null,
      },
      contact,
      []
    );
    expect(result.kind).toBe("invalid");
  });
});
