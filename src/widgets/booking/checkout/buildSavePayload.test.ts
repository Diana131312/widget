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
    fullName: "Иван Петров",
    phone: "+7 (900) 123-45-67",
    comment: "Окно",
    messenger: "telegram" as const,
  };

  it("builds homes dailySave body", () => {
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
    expect(result).toMatchObject({
      kind: "homes",
      body: {
        dailyRoomId: "d1",
        checkInDate: "2026-10-10",
        checkOutDate: "2026-10-12",
        personCount: 3,
        name: "Иван",
        lastName: "Петров",
        messenger: "telegram",
      },
    });
  });

  it("builds banya saveRoomBooking body with slot duration", () => {
    const result = buildSaveBodies(
      {
        categoryId: "banya",
        roomId: "b1",
        guestCount: 2,
        productQuantities: {},
        total: 4500,
        checkIn: null,
        checkOut: null,
        banyaDate: "2026-10-07",
        banyaTimeFrom: "12:00",
        banyaTimeTo: "15:00",
        slotDuration: 4,
      },
      contact,
      []
    );
    expect(result).toMatchObject({
      kind: "banya",
      body: {
        roomId: "b1",
        date: "2026-10-07",
        time: "12:00",
        duration: 4,
        personCount: 2,
        price: 4500,
        name: "Иван",
        lastName: "Петров",
      },
    });
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
