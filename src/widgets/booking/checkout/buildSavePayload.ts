import type { WidgetGetResponse, WidgetProduct } from "../../../api";
import { computeDurationHours } from "../setup/calculate.utils";
import type { BookingCategoryId } from "../types";
import { formatRuPhoneMask } from "./phone";

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

/** Тела запросов dailySave / saveRoomBooking (без alias — его добавит API-клиент). */
export function buildSaveBodies(
  draft: CheckoutDraft,
  contact: CheckoutContact,
  products: Array<{ id: string; name: string; price: number; count: number }>
):
  | { kind: "homes"; body: Record<string, unknown> }
  | { kind: "banya"; body: Record<string, unknown> }
  | { kind: "invalid"; reason: string } {
  const { name, lastName } = splitFullName(contact.fullName);
  const phone = formatRuPhoneMask(contact.phone);

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
        products,
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
      price: draft.total,
      products,
    },
  };
}
