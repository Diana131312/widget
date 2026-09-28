import { describe, expect, it } from "vitest";
import type { RoomTimeSlot } from "../../../api";
import {
  groupItemsByComment,
  groupSlotsByComment,
  splitPromoHourGiftSlots,
} from "./banyaSlotVariants";

function slot(
  partial: Partial<RoomTimeSlot> & Pick<RoomTimeSlot, "timeFrom">
): RoomTimeSlot {
  return {
    timeTo: "15:00",
    duration: 3,
    price: 1000,
    isAvailable: true,
    comment: null,
    ...partial,
  } as RoomTimeSlot;
}

describe("groupSlotsByComment", () => {
  it("groups by server comment and keeps order", () => {
    const slots = [
      slot({ timeFrom: "10:00", comment: 'Акция "ЧАС В ПОДАРОК"' }),
      slot({
        timeFrom: "12:00",
        comment: 'Акция "6 часов отдыха с 20% скидкой"',
      }),
      slot({ timeFrom: "14:00", comment: 'Акция "ЧАС В ПОДАРОК"' }),
      slot({ timeFrom: "16:00", comment: null }),
    ];
    const groups = groupSlotsByComment(slots);
    expect(groups.map((g) => g.title)).toEqual([
      'Акция "ЧАС В ПОДАРОК"',
      'Акция "6 часов отдыха с 20% скидкой"',
      "Стандарт",
    ]);
    expect(groups[0].items.map((i) => i.index)).toEqual([0, 2]);
  });
});

describe("splitPromoHourGiftSlots", () => {
  it("splits promo vs others", () => {
    const split = splitPromoHourGiftSlots([
      slot({ timeFrom: "10:00", comment: 'Акция "ЧАС В ПОДАРОК"', duration: 4 }),
      slot({ timeFrom: "12:00", comment: "Стандарт", duration: 2 }),
      slot({ timeFrom: "14:00", comment: "час в подарок", duration: 2 }),
    ]);
    expect(split.promo.map((i) => i.slot.timeFrom)).toEqual(["14:00", "10:00"]);
    expect(split.others.map((i) => i.slot.timeFrom)).toEqual(["12:00"]);
  });
});

describe("groupItemsByComment", () => {
  it("groups other slots by description", () => {
    const split = splitPromoHourGiftSlots([
      slot({ timeFrom: "10:00", comment: 'Акция "ЧАС В ПОДАРОК"' }),
      slot({ timeFrom: "12:00", comment: 'Акция "6 часов"', duration: 6 }),
      slot({ timeFrom: "14:00", comment: "Стандарт", duration: 2 }),
      slot({ timeFrom: "16:00", comment: 'Акция "6 часов"', duration: 3 }),
    ]);
    const groups = groupItemsByComment(split.others);
    expect(groups.map((g) => g.title)).toEqual([
      'Акция "6 часов"',
      "Стандарт",
    ]);
    expect(groups[0].items.map((i) => i.slot.duration)).toEqual([3, 6]);
  });
});
