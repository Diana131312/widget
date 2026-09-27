import { describe, expect, it } from "vitest";
import {
  DEFAULT_BOOKING_URL_STATE,
  decodeProducts,
  encodeProducts,
  parseBookingUrl,
  writeBookingUrl,
} from "./bookingUrl";

describe("decodeProducts / encodeProducts", () => {
  it("roundtrips product quantities", () => {
    const qty = { a: 2, b: 1 };
    expect(decodeProducts(encodeProducts(qty))).toEqual(qty);
  });

  it("skips invalid segments", () => {
    expect(decodeProducts("x:0,y:-1,z:3,bad")).toEqual({ z: 3 });
  });
});

describe("parseBookingUrl", () => {
  it("parses homes setup link", () => {
    expect(
      parseBookingUrl(
        "?bk_step=setup&bk_cat=homes&bk_room=d1&bk_in=2026-10-10&bk_out=2026-10-12"
      )
    ).toEqual({
      stepId: "setup",
      categoryId: "homes",
      roomId: "d1",
      checkIn: "2026-10-10",
      checkOut: "2026-10-12",
      banyaDate: null,
      banyaTimeFrom: null,
      banyaTimeTo: null,
      guestCount: 0,
      productQuantities: {},
    });
  });

  it("parses guests and products on setup", () => {
    expect(
      parseBookingUrl(
        "?bk_step=setup&bk_cat=banya&bk_room=b1&bk_date=2026-10-07&bk_from=12:00&bk_to=15:00&bk_guests=4&bk_products=p1:2,p2:1"
      )
    ).toMatchObject({
      stepId: "setup",
      guestCount: 4,
      productQuantities: { p1: 2, p2: 1 },
    });
  });

  it("ignores guests/products on object step", () => {
    expect(
      parseBookingUrl("?bk_step=object&bk_cat=banya&bk_room=b1&bk_guests=3&bk_products=p1:1")
    ).toMatchObject({
      stepId: "object",
      guestCount: 0,
      productQuantities: {},
    });
  });

  it("parses banya setup link", () => {
    expect(
      parseBookingUrl(
        "?bk_step=setup&bk_cat=banya&bk_room=b1&bk_date=2026-10-07&bk_from=12:00&bk_to=15:00"
      )
    ).toMatchObject({
      stepId: "setup",
      categoryId: "banya",
      roomId: "b1",
      banyaDate: "2026-10-07",
      banyaTimeFrom: "12:00",
      banyaTimeTo: "15:00",
    });
  });

  it("parses object focus link with room id", () => {
    expect(parseBookingUrl("?bk_cat=banya&bk_room=b1")).toMatchObject({
      stepId: "object",
      categoryId: "banya",
      roomId: "b1",
    });
  });
});

describe("buildObjectFocusUrl", () => {
  it("builds focus link for a room", async () => {
    const { buildObjectFocusUrl } = await import("./bookingUrl");
    const href = buildObjectFocusUrl("banya", "b1");
    expect(href).toContain("bk_step=object");
    expect(href).toContain("bk_cat=banya");
    expect(href).toContain("bk_room=b1");
    expect(href).not.toContain("bk_guests");
    expect(href).not.toContain("bk_products");
  });
});

describe("writeBookingUrl", () => {
  it("writes replaceState query", () => {
    writeBookingUrl({
      ...DEFAULT_BOOKING_URL_STATE,
      stepId: "object",
      categoryId: "homes",
    });
    expect(window.location.search).toContain("bk_step=object");
    expect(window.location.search).toContain("bk_cat=homes");
  });

  it("writes guests and products on setup", () => {
    writeBookingUrl({
      ...DEFAULT_BOOKING_URL_STATE,
      stepId: "setup",
      categoryId: "banya",
      roomId: "b1",
      banyaDate: "2026-10-07",
      banyaTimeFrom: "12:00",
      banyaTimeTo: "15:00",
      guestCount: 3,
      productQuantities: { p1: 2 },
    });
    expect(window.location.search).toContain("bk_guests=3");
    expect(window.location.search).toContain("bk_products=p1%3A2");
  });
});
