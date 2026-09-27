import { describe, expect, it } from "vitest";
import type { RoomTimeSlot } from "../../../api";
import { groupSlotsByComment } from "./BanyaTimeSlots";

function slot(partial: Partial<RoomTimeSlot> & Pick<RoomTimeSlot, "timeFrom">): RoomTimeSlot {
  return {
    timeTo: "15:00",
    duration: 3,
    price: 1000,
    isAvailable: true,
    comment: null,
    ...partial,
  } as RoomTimeSlot;
}

describe("groupSlotsByComment (re-export)", () => {
  it("groups by server comment and keeps order", () => {
    const slots = [
      slot({ timeFrom: "10:00", comment: 'Акция "ЧАС В ПОДАРОК"' }),
      slot({ timeFrom: "12:00", comment: 'Акция "6 часов отдыха с 20% скидкой"' }),
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
