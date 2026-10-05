import type { WidgetGetResponse, WidgetProduct } from "../../../api";
import type { BookingCategoryId } from "../types";
import { computeDurationHours, toApiTime } from "../setup/calculate.utils";
import { toApiPhone } from "./phone";
import type { VerifyChannel } from "./checkoutDraft";

export type CheckoutDraft = {
  categoryId: BookingCategoryId;
  roomId: string;
  guestCount: number;
  productQuantities: Record<string, number>;
  total: number;
  checkIn: string | null;
  checkOut: string | null;
  banyaDate: string | null;
  banyaTimeFrom: string | null;
  banyaTimeTo: string | null;
  slotDuration: number | null;
};

export type CheckoutContact = {
  firstName: string;
  lastName: string;
  phone: string;
  comment: string;
  verifyChannel: VerifyChannel;
};

export type SaveProductLine = {
  id: string;
  name: string;
  price: number;
  count: number;
};

export function buildCheckoutProducts(
  config: WidgetGetResponse,
  quantities: Record<string, number>
): SaveProductLine[] {
  const byId = new Map<string, WidgetProduct>();
  for (const p of config.products ?? []) byId.set(p.id, p);

  return Object.entries(quantities)
    .map(([id, count]) => {
      const product = byId.get(id);
      if (!product || count <= 0) return null;
      return {
        id: product.id,
        name: product.name,
        price: product.price,
        count,
      };
    })
    .filter(Boolean) as SaveProductLine[];
}

export function toApiMessenger(
  channel: VerifyChannel
): "telegram" | "max" | null {
  if (channel === "call") return null;
  return channel;
}

export type BanyaSaveBody = {
  roomId: string;
  date: string;
  time: string;
  duration: number;
  personCount: number;
  name: string;
  lastName: string;
  phone: string;
  messenger: "telegram" | "max" | null;
  comment: string;
  promoCode: null;
  discounts: number[];
  products: SaveProductLine[];
  checkCode?: string;
};

export type HomesSaveBody = {
  dailyRoomId: string;
  checkInDate: string;
  checkOutDate: string;
  personCount: number;
  name: string;
  lastName: string;
  phone: string;
  messenger: "telegram" | "max" | null;
  comment: string;
  products: SaveProductLine[];
  checkCode?: string;
};

/** Тела /save и /daily-save строго по widget API (без alias — добавит клиент). */
export function buildSaveBodies(
  draft: CheckoutDraft,
  contact: CheckoutContact,
  products: SaveProductLine[],
  checkCode?: string
):
  | { kind: "homes"; body: HomesSaveBody }
  | { kind: "banya"; body: BanyaSaveBody }
  | { kind: "invalid"; reason: string } {
  const name = contact.firstName.trim();
  const lastName = contact.lastName.trim();
  const phone = toApiPhone(contact.phone);
  const messenger = toApiMessenger(contact.verifyChannel);
  const productList = products.length > 0 ? products : [];
  const comment = contact.comment.trim();

  if (!name || !lastName) {
    return { kind: "invalid", reason: "Укажите имя и фамилию" };
  }

  if (draft.categoryId === "homes") {
    if (!draft.checkIn || !draft.checkOut) {
      return { kind: "invalid", reason: "Не выбраны даты проживания" };
    }
    return {
      kind: "homes",
      body: {
        dailyRoomId: draft.roomId,
        checkInDate: draft.checkIn,
        checkOutDate: draft.checkOut,
        personCount: draft.guestCount,
        name,
        lastName,
        phone,
        messenger,
        comment,
        products: productList,
        ...(checkCode ? { checkCode } : {}),
      },
    };
  }

  if (!draft.banyaDate || !draft.banyaTimeFrom || !draft.banyaTimeTo) {
    return { kind: "invalid", reason: "Не выбран слот бани" };
  }

  const duration =
    draft.slotDuration != null && draft.slotDuration > 0
      ? draft.slotDuration
      : computeDurationHours(draft.banyaTimeFrom, draft.banyaTimeTo);

  return {
    kind: "banya",
    body: {
      roomId: draft.roomId,
      date: draft.banyaDate,
      time: toApiTime(draft.banyaTimeFrom),
      duration,
      personCount: Math.max(1, draft.guestCount),
      name,
      lastName,
      phone,
      messenger,
      comment,
      promoCode: null,
      discounts: [],
      products: productList,
      ...(checkCode ? { checkCode } : {}),
    },
  };
}
