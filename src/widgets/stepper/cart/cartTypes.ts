import type { CategoryId } from "../types";
import { completeBookingDraft, type BookingFlowDraft } from "../types";

export type CartBookingItem = {
  id: string;
  categoryId: CategoryId;
  roomId: string;
  roomName: string;
  guestCount: number;
  basePrice: number;
  productsSubtotal: number;
  total: number;
  productQuantities: Record<string, number>;
  date?: string;
  timeFrom?: string;
  timeTo?: string;
  slotDuration?: number;
  slotLabel?: string;
  checkInDate?: string;
  checkOutDate?: string;
};

export function createCartItemId(): string {
  return `cart-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function buildCartItemFromDraft(
  categoryId: CategoryId,
  draft: BookingFlowDraft,
  productsSubtotal: number,
  total: number,
  existingId?: string
): CartBookingItem | null {
  const complete = completeBookingDraft(draft, categoryId);
  if (!complete) return null;

  return {
    id: existingId ?? createCartItemId(),
    categoryId,
    roomId: complete.roomId,
    roomName: complete.roomName,
    guestCount: complete.guestCount,
    basePrice: complete.basePrice,
    productsSubtotal,
    total,
    productQuantities: { ...(complete.productQuantities ?? {}) },
    date: complete.date,
    timeFrom: complete.timeFrom,
    timeTo: complete.timeTo,
    slotDuration: draft.slotDuration,
    slotLabel: draft.slotLabel,
    checkInDate: complete.checkInDate,
    checkOutDate: complete.checkOutDate,
  };
}

export function cartItemToFlowDraft(item: CartBookingItem): BookingFlowDraft {
  return {
    roomId: item.roomId,
    roomName: item.roomName,
    guestCount: item.guestCount,
    basePrice: item.basePrice,
    productQuantities: { ...item.productQuantities },
    date: item.date,
    timeFrom: item.timeFrom,
    timeTo: item.timeTo,
    slotDuration: item.slotDuration,
    slotLabel: item.slotLabel,
    checkInDate: item.checkInDate,
    checkOutDate: item.checkOutDate,
  };
}

export function getCartItemsTotal(items: CartBookingItem[]): number {
  return items.reduce((sum, item) => sum + item.total, 0);
}

export function getCategoryLabel(categoryId: CategoryId): string {
  if (categoryId === "homes") return "Дом";
  if (categoryId === "banyaTest") return "Баня";
  return "Баня";
}

export function isBanyaCategory(categoryId: CategoryId): boolean {
  return categoryId === "banya" || categoryId === "banyaTest";
}

export function isBanyaCartItem(item: CartBookingItem): boolean {
  return isBanyaCategory(item.categoryId);
}

export function isHomeCartItem(item: CartBookingItem): boolean {
  return item.categoryId === "homes";
}
