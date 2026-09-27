import { describe, expect, it } from "vitest";
import type { RoomTimeSlot } from "../../../api";
import {
  classifySlotDayPart,
  groupItemsByComment,
  groupSlotsByComment,
  groupSlotsByDayPart,
  resolveBanyaSlotsVariant,
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

describe("resolveBanyaSlotsVariant", () => {
  it("detects ryabinova and berezova", () => {
    expect(resolveBanyaSlotsVariant("Рябиновая")).toBe("dayparts");
    expect(resolveBanyaSlotsVariant("Баня Рябиновая")).toBe("dayparts");
    expect(resolveBanyaSlotsVariant("Берёзовая")).toBe("promo-below");
    expect(resolveBanyaSlotsVariant("Березовая баня")).toBe("promo-below");
    expect(resolveBanyaSlotsVariant("Кедровая")).toBe("default");
  });
});

describe("classifySlotDayPart", () => {
  it("puts 10–16 into day (more hours after noon)", () => {
    expect(classifySlotDayPart("10:00", "16:00")).toBe("День");
  });

  it("classifies morning / evening", () => {
    expect(classifySlotDayPart("08:00", "11:00")).toBe("Утро");
    expect(classifySlotDayPart("19:00", "23:00")).toBe("Вечер");
  });

  it("treats 00:00 end as evening", () => {
    expect(classifySlotDayPart("22:00", "00:00")).toBe("Вечер");
    expect(classifySlotDayPart("20:00", "00:00")).toBe("Вечер");
  });
});

describe("groupSlotsByDayPart", () => {
  it("groups and sorts by duration ascending", () => {
    const groups = groupSlotsByDayPart([
      slot({ timeFrom: "10:00", timeTo: "16:00", duration: 6 }),
      slot({ timeFrom: "12:00", timeTo: "14:00", duration: 2 }),
      slot({ timeFrom: "08:00", timeTo: "10:00", duration: 2 }),
      slot({ timeFrom: "19:00", timeTo: "22:00", duration: 3 }),
    ]);
    expect(groups.map((g) => g.title)).toEqual(["Утро", "День", "Вечер"]);
    expect(groups[1].items.map((i) => i.slot.duration)).toEqual([2, 6]);
  });
});

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
