import {
  eachDayOfInterval,
  format,
  parseISO,
  subDays,
} from "date-fns";
import type { RoomTimeSlot, WidgetApiClient, WidgetDailyRoom, WidgetRoom } from "../../../api";
import {
  expandOccupiedNights,
  loadDailyOccupied,
  rangeHasOccupiedNights,
} from "../../daily/dailyOccupiedService";
import { loadRoomTimeSlots } from "../../calendar/slotsService";
import type { CartBookingItem } from "../../cart/cartTypes";
import { isBanyaCartItem, isHomeCartItem } from "../../cart/cartTypes";

export type HomeStayRange = {
  checkIn: string;
  checkOut: string;
  relatedBanyaDate: string;
};

export type SuggestedHomeOffer = {
  room: WidgetDailyRoom;
  checkIn: string;
  checkOut: string;
  nights: number;
  price: number;
  relatedBanyaDate: string;
};

export type BanyaSlotOffer = {
  roomId: string;
  roomName: string;
  date: string;
  slot: RoomTimeSlot;
};

/** Ночь перед днём бани: заезд (date−1), выезд (date). */
export function homeRangeForBanyaDate(banyaDate: string): HomeStayRange {
  const d = parseISO(banyaDate);
  const checkIn = format(subDays(d, 1), "yyyy-MM-dd");
  return { checkIn, checkOut: banyaDate, relatedBanyaDate: banyaDate };
}

export function collectBanyaDatesFromCart(items: CartBookingItem[]): string[] {
  const dates = new Set<string>();
  for (const item of items) {
    if (isBanyaCartItem(item) && item.date) dates.add(item.date);
  }
  return [...dates].sort();
}

/** Все дни проживания в доме (включительно checkIn … checkOut). */
export function collectDatesFromHomeCart(items: CartBookingItem[]): string[] {
  const dates = new Set<string>();
  for (const item of items) {
    if (!isHomeCartItem(item) || !item.checkInDate || !item.checkOutDate) continue;
    const start = parseISO(item.checkInDate);
    const end = parseISO(item.checkOutDate);
    eachDayOfInterval({ start, end }).forEach((d) => {
      dates.add(format(d, "yyyy-MM-dd"));
    });
  }
  return [...dates].sort();
}

async function isHomeRangeAvailable(
  api: WidgetApiClient,
  roomId: string,
  checkIn: string,
  checkOut: string
): Promise<boolean> {
  const anchor = parseISO(checkIn);
  const ranges = await loadDailyOccupied(api, roomId, anchor);
  const occupied = expandOccupiedNights(ranges);
  return !rangeHasOccupiedNights(checkIn, checkOut, occupied);
}

export async function fetchSuggestedHomes(
  api: WidgetApiClient,
  dailyRooms: WidgetDailyRoom[],
  banyaDates: string[],
  limit = 3
): Promise<SuggestedHomeOffer[]> {
  if (!banyaDates.length || !dailyRooms.length) return [];

  const stayRanges = banyaDates.map(homeRangeForBanyaDate);
  const offers: SuggestedHomeOffer[] = [];
  const usedRoomIds = new Set<string>();

  for (const range of stayRanges) {
    for (const room of dailyRooms) {
      if (usedRoomIds.has(room.id)) continue;
      if (offers.length >= limit) break;

      const available = await isHomeRangeAvailable(
        api,
        room.id,
        range.checkIn,
        range.checkOut
      );
      if (!available) continue;

      let price = room.pricePeriod?.weekDayPrice ?? 0;
      try {
        const calc = await api.dailyCalculate({
          roomId: room.id,
          checkInDate: range.checkIn,
          checkOutDate: range.checkOut,
          personCount: 1,
        });
        price = calc.totalPrice ?? price;
      } catch {
        /* fallback to period price */
      }

      const nights = Math.max(
        1,
        eachDayOfInterval({
          start: parseISO(range.checkIn),
          end: subDays(parseISO(range.checkOut), 1),
        }).length
      );

      offers.push({
        room,
        checkIn: range.checkIn,
        checkOut: range.checkOut,
        nights,
        price,
        relatedBanyaDate: range.relatedBanyaDate,
      });
      usedRoomIds.add(room.id);
    }
    if (offers.length >= limit) break;
  }

  return offers;
}

export type BanyaRoomAvailability = {
  room: WidgetRoom;
  availableDates: string[];
  slotsByDate: Record<string, RoomTimeSlot[]>;
};

export async function fetchBanyaRoomsAvailability(
  api: WidgetApiClient,
  rooms: WidgetRoom[],
  homeItems: CartBookingItem[],
  limit = 3
): Promise<BanyaRoomAvailability[]> {
  const dates = collectDatesFromHomeCart(homeItems);
  if (!dates.length || !rooms.length) return [];

  const result: BanyaRoomAvailability[] = [];

  for (const room of rooms) {
    if (result.length >= limit) break;

    const slotsByDate: Record<string, RoomTimeSlot[]> = {};
    const availableDates: string[] = [];

    for (const date of dates) {
      try {
        const slots = await loadRoomTimeSlots(api, room.id, date);
        const available = slots.filter((s) => s.isAvailable);
        if (available.length > 0) {
          slotsByDate[date] = available;
          availableDates.push(date);
        }
      } catch {
        /* skip date */
      }
    }

    if (availableDates.length > 0) {
      result.push({ room, availableDates, slotsByDate });
    }
  }

  return result;
}

export function slotOptionKey(
  roomId: string,
  date: string,
  slot: RoomTimeSlot
): string {
  return `${roomId}-${date}-${slot.timeFrom}-${slot.timeTo}-${slot.duration}`;
}

export function filterOffersByDate(
  offers: BanyaSlotOffer[],
  date: string
): BanyaSlotOffer[] {
  return offers.filter((o) => o.date === date);
}

export function offerKey(offer: BanyaSlotOffer): string {
  return `${offer.roomId}-${offer.date}-${offer.slot.timeFrom}-${offer.slot.timeTo}-${offer.slot.duration}`;
}

export function buildSlotLabel(slot: RoomTimeSlot): string {
  const comment = slot.comment?.trim();
  if (comment) return comment;
  return `${slot.timeFrom} — ${slot.timeTo}`;
}
