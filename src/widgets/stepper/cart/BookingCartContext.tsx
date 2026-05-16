import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { BookingFlowDraft, CategoryId } from "../types";
import { useBookingFlow } from "../booking/BookingFlowContext";
import {
  buildCartItemFromDraft,
  cartItemToFlowDraft,
  getCartItemsTotal,
  type CartBookingItem,
} from "./cartTypes";
import { getObjectStepId } from "../utils/stepNavigation";
import type { StepId } from "../types";

export type BookingCartContextValue = {
  items: CartBookingItem[];
  editingItemId: string | null;
  cartCount: number;
  cartTotal: number;
  addCurrentDraftToCart: (
    categoryId: CategoryId,
    productsSubtotal: number,
    total: number
  ) => boolean;
  removeItem: (id: string) => void;
  startNewBooking: (categoryId: CategoryId) => StepId;
  /** Предзаполненный черновик → сразу шаг 3 */
  startPrefilledBooking: (
    categoryId: CategoryId,
    draft: Partial<BookingFlowDraft>
  ) => StepId;
  startEditItem: (id: string) => StepId | null;
  clearCart: () => void;
};

const BookingCartContext = createContext<BookingCartContextValue | null>(null);

export function BookingCartProvider({ children }: { children: React.ReactNode }) {
  const flow = useBookingFlow();
  const [items, setItems] = useState<CartBookingItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const addCurrentDraftToCart = useCallback(
    (categoryId: CategoryId, productsSubtotal: number, total: number): boolean => {
      const item = buildCartItemFromDraft(
        categoryId,
        flow.draft ?? { guestCount: 0 },
        productsSubtotal,
        total,
        editingItemId ?? undefined
      );
      if (!item) return false;

      setItems((prev) => {
        if (editingItemId) {
          return prev.map((x) => (x.id === editingItemId ? item : x));
        }
        return [...prev, item];
      });
      setEditingItemId(null);
      flow.patchDraft({ guestCount: 0 });
      return true;
    },
    [editingItemId, flow]
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
    if (editingItemId === id) setEditingItemId(null);
  }, [editingItemId]);

  const resetFlowForNewBooking = useCallback(
    (categoryId: CategoryId) => {
      setEditingItemId(null);
      flow.setCategoryId(categoryId);
      flow.patchDraft({
        guestCount: 0,
        roomId: undefined,
        roomName: undefined,
        date: undefined,
        timeFrom: undefined,
        timeTo: undefined,
        slotDuration: undefined,
        slotPrice: undefined,
        slotLabel: undefined,
        checkInDate: undefined,
        checkOutDate: undefined,
        basePrice: undefined,
        productQuantities: {},
      });
    },
    [flow]
  );

  const startNewBooking = useCallback(
    (categoryId: CategoryId): StepId => {
      resetFlowForNewBooking(categoryId);
      const objectStep = getObjectStepId(categoryId);
      return objectStep ?? "category";
    },
    [resetFlowForNewBooking]
  );

  const startPrefilledBooking = useCallback(
    (categoryId: CategoryId, partial: Partial<BookingFlowDraft>): StepId => {
      setEditingItemId(null);
      flow.setCategoryId(categoryId);
      flow.patchDraft({
        guestCount: 0,
        productQuantities: {},
        ...partial,
      });
      return "bookingStepThree";
    },
    [flow]
  );

  const startEditItem = useCallback(
    (id: string): StepId | null => {
      const item = items.find((x) => x.id === id);
      if (!item) return null;
      setEditingItemId(id);
      flow.setCategoryId(item.categoryId);
      flow.patchDraft(cartItemToFlowDraft(item));
      return "bookingStepThree";
    },
    [items, flow]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setEditingItemId(null);
  }, []);

  const value = useMemo<BookingCartContextValue>(
    () => ({
      items,
      editingItemId,
      cartCount: items.length,
      cartTotal: getCartItemsTotal(items),
      addCurrentDraftToCart,
      removeItem,
      startNewBooking,
      startPrefilledBooking,
      startEditItem,
      clearCart,
    }),
    [
      items,
      editingItemId,
      addCurrentDraftToCart,
      removeItem,
      startNewBooking,
      startPrefilledBooking,
      startEditItem,
      clearCart,
    ]
  );

  return (
    <BookingCartContext.Provider value={value}>{children}</BookingCartContext.Provider>
  );
}

export function useBookingCart(): BookingCartContextValue {
  const ctx = useContext(BookingCartContext);
  if (!ctx) throw new Error("useBookingCart must be used within BookingCartProvider");
  return ctx;
}
