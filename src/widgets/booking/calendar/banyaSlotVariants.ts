import type { RoomTimeSlot } from "../../../api";

export type SlotGroupItem = { slot: RoomTimeSlot; index: number };

export type SlotGroup = {
  title: string;
  items: SlotGroupItem[];
};

const PROMO_HOUR_GIFT_RE = /час\s*в\s*подарок/i;

export function isPromoHourGiftComment(comment: string | null | undefined): boolean {
  return PROMO_HOUR_GIFT_RE.test((comment ?? "").trim());
}

function sortByDurationAsc(items: SlotGroupItem[]): SlotGroupItem[] {
  return [...items].sort((a, b) => {
    const da = Number(a.slot.duration) || 0;
    const db = Number(b.slot.duration) || 0;
    if (da !== db) return da - db;
    return a.index - b.index;
  });
}

/** Группы по comment с сервера (порядок первого появления). */
export function groupSlotsByComment(slots: RoomTimeSlot[]): SlotGroup[] {
  const map = new Map<string, SlotGroup>();
  slots.forEach((slot, index) => {
    const title = (slot.comment ?? "").trim() || "Стандарт";
    const existing = map.get(title);
    if (existing) {
      existing.items.push({ slot, index });
    } else {
      map.set(title, { title, items: [{ slot, index }] });
    }
  });
  return Array.from(map.values());
}

export type PromoSplit = {
  promo: SlotGroupItem[];
  others: SlotGroupItem[];
};

/** Акция «ЧАС В ПОДАРОК» отдельно от остальных. */
export function splitPromoHourGiftSlots(slots: RoomTimeSlot[]): PromoSplit {
  const promo: SlotGroupItem[] = [];
  const others: SlotGroupItem[] = [];
  slots.forEach((slot, index) => {
    const item = { slot, index };
    if (isPromoHourGiftComment(slot.comment)) promo.push(item);
    else others.push(item);
  });
  return {
    promo: sortByDurationAsc(promo),
    others,
  };
}

/** Группы по comment для уже отфильтрованных items (сохраняет исходные index). */
export function groupItemsByComment(items: SlotGroupItem[]): SlotGroup[] {
  const map = new Map<string, SlotGroup>();
  for (const item of items) {
    const title = (item.slot.comment ?? "").trim() || "Стандарт";
    const existing = map.get(title);
    if (existing) existing.items.push(item);
    else map.set(title, { title, items: [item] });
  }
  return Array.from(map.values()).map((g) => ({
    ...g,
    items: sortByDurationAsc(g.items),
  }));
}
