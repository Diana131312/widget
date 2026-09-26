import { describe, expect, it } from "vitest";
import {
  DEFAULT_BOOKING_URL_STATE,
  parseBookingUrl,
  writeBookingUrl,
} from "./bookingUrl";

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

  it("falls back to category on empty/invalid", () => {
    expect(parseBookingUrl("")).toEqual(DEFAULT_BOOKING_URL_STATE);
    expect(parseBookingUrl("?bk_step=nope").stepId).toBe("category");
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
});
