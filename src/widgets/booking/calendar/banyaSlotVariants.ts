import type { RoomTimeSlot } from "../../../api";

/** Временные эксперименты UI слотов по имени бани. */
export type BanyaSlotsVariant = "default" | "dayparts" | "promo-below";

export type SlotGroupItem = { slot: RoomTimeSlot; index: number };

export type SlotGroup = {
  title: string;
  items: SlotGroupItem[];
};

const DAYPART_ORDER = ["Утро", "День", "Вечер"] as const;
export type DayPartTitle = (typeof DAYPART_ORDER)[number];

/** Границы суток (минуты от 00:00). 00:00–06:00 относится к вечеру. */
const DAYPART_BOUNDS: Array<{ title: DayPartTitle; start: number; end: number }> =
  [
    { title: "Вечер", start: 0, end: 6 * 60 },
    { title: "Утро", start: 6 * 60, end: 12 * 60 },
    { title: "День", start: 12 * 60, end: 18 * 60 },
    { title: "Вечер", start: 18 * 60, end: 24 * 60 },
  ];

const PROMO_HOUR_GIFT_RE = /час\s*в\s*подарок/i;

export function resolveBanyaSlotsVariant(roomName: string): BanyaSlotsVariant {
  const name = roomName.trim().toLowerCase();
  if (/рябин/.test(name)) return "dayparts";
  if (/бер[её]з/.test(name)) return "promo-below";
  return "default";
}

export function isPromoHourGiftComment(comment: string | null | undefined): boolean {
  return PROMO_HOUR_GIFT_RE.test((comment ?? "").trim());
}

function parseHmToMinutes(hm: string, asEnd = false): number {
  const [h, m] = hm.split(":").map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  // Конец слота в 00:00 / 23:59 / 24:00 → полночь = вечер (конец суток)
  if (asEnd && (h === 0 && m === 0)) return 24 * 60;
  if (h === 24 || (h === 23 && m === 59)) return 24 * 60;
  return Math.min(24 * 60, Math.max(0, h * 60 + m));
}

function overlapMinutes(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

/** В какой промежуток слот попадает сильнее по часам. */
export function classifySlotDayPart(
  timeFrom: string,
  timeTo: string
): DayPartTitle {
  const start = parseHmToMinutes(timeFrom, false);
  let end = parseHmToMinutes(timeTo, true);
  if (end <= start) end = 24 * 60; // слот через полночь → до конца суток

  let best: DayPartTitle = "День";
  let bestOverlap = -1;
  for (const part of DAYPART_BOUNDS) {
    const ov = overlapMinutes(start, end, part.start, part.end);
    if (ov > bestOverlap) {
      bestOverlap = ov;
      best = part.title;
    }
  }
  return best;
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

/** Утро / День / Вечер + сортировка по длительности внутри группы. */
export function groupSlotsByDayPart(slots: RoomTimeSlot[]): SlotGroup[] {
  const buckets = new Map<DayPartTitle, SlotGroupItem[]>();
  for (const title of DAYPART_ORDER) buckets.set(title, []);

  slots.forEach((slot, index) => {
    const part = classifySlotDayPart(slot.timeFrom, slot.timeTo);
    buckets.get(part)!.push({ slot, index });
  });

  return DAYPART_ORDER.map((title) => ({
    title,
    items: sortByDurationAsc(buckets.get(title) ?? []),
  })).filter((g) => g.items.length > 0);
}

export type PromoSplit = {
  promo: SlotGroupItem[];
  others: SlotGroupItem[];
};

/** Берёзовая: акция «ЧАС В ПОДАРОК» отдельно от остальных. */
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
    others, // порядок первого появления comment — для groupItemsByComment
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
