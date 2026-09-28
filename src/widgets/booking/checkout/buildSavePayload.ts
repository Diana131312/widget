import type { WidgetGetResponse, WidgetProduct } from "../../../api";
import { computeDurationHours } from "../setup/calculate.utils";
import type { BookingCategoryId } from "../types";
import { toApiPhone } from "./phone";

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
  fullName: string;
  phone: string;
  comment: string;
  messenger: "telegram" | "max";
};

export function buildCheckoutProducts(
  config: WidgetGetResponse,
  quantities: Record<string, number>
): Array<{ id: string; name: string; price: number; count: number }> {
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
    .filter(Boolean) as Array<{
    id: string;
    name: string;
    price: number;
    count: number;
  }>;
}

export function splitFullName(fullName: string): {
  name: string;
  lastName: string | undefined;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    name: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") || undefined,
  };
}

export type BanyaSaveBody = {
  roomId: string;
  date: string;
  time: string;
  duration: number;
  personCount: number;
  name: string;
  lastName?: string;
  phone: string;
  messenger: "telegram" | "max";
  comment: string;
  discounts: number[];
  promoCode: null;
  products: Array<{ id: string; name: string; price: number; count: number }>;
  checkCode?: string;
};

export type HomesSaveBody = {
  dailyRoomId: string;
  checkInDate: string;
  checkOutDate: string;
  personCount: number;
  name: string;
  lastName?: string;
  phone: string;
  messenger: "telegram" | "max";
  comment?: string;
  products: Array<{ id: string; name: string; price: number; count: number }>;
  checkCode?: string;
};

/** Тела запросов dailySave / saveRoomBooking (без alias — его добавит API-клиент). */
export function buildSaveBodies(
  draft: CheckoutDraft,
  contact: CheckoutContact,
  products: Array<{ id: string; name: string; price: number; count: number }>,
  checkCode?: string
):
  | { kind: "homes"; body: HomesSaveBody }
  | { kind: "banya"; body: BanyaSaveBody }
  | { kind: "invalid"; reason: string } {
  const { name, lastName } = splitFullName(contact.fullName);
  const phone = toApiPhone(contact.phone);
  const productList = products.length > 0 ? products : [];

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
        messenger: contact.messenger,
        comment: contact.comment.trim() || undefined,
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
      time: draft.banyaTimeFrom,
      duration,
      personCount: Math.max(1, draft.guestCount),
      name,
      lastName,
      phone,
      messenger: contact.messenger,
      comment: contact.comment.trim(),
      discounts: [],
      promoCode: null,
      products: productList,
      ...(checkCode ? { checkCode } : {}),
    },
  };
}
