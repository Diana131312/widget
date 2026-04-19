import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { BookingFlowDraft, CategoryId } from "../types";
import { parseUrlState } from "../utils/urlSync";
import type { WidgetGetResponse, WidgetRoom } from "../../../api";

function preservedContacts(prev: BookingFlowDraft | null | undefined): Pick<
  BookingFlowDraft,
  "contactFullName" | "contactPhone" | "comment"
> {
  return {
    contactFullName: prev?.contactFullName,
    contactPhone: prev?.contactPhone,
    comment: prev?.comment,
  };
}

function computeInitialFromUrl(): {
  categoryId?: CategoryId;
  selectedRoomId?: string;
  allRoomsSelected: boolean;
  draft: BookingFlowDraft | null;
} {
  if (typeof window === "undefined") {
    return { allRoomsSelected: false, draft: null };
  }
  const u = parseUrlState();
  const bookingDeepLink =
    u.widgetStep === "2" ||
    u.step === "bani" ||
    Boolean(u.roomId && (u.date || u.timeFrom || u.timeTo));
  const categoryId: CategoryId | undefined =
    u.categoryId ?? (bookingDeepLink ? "banya" : undefined);
  const allRoomsSelected = u.mode === "all";
  const selectedRoomId = allRoomsSelected ? undefined : u.roomId;

  let draft: BookingFlowDraft | null = null;
  if (selectedRoomId) {
    draft = {
      guestCount: 1,
      roomId: selectedRoomId,
      roomName: undefined,
      ...(u.date ? { date: u.date } : {}),
      ...(u.timeFrom ? { timeFrom: u.timeFrom } : {}),
      ...(u.timeTo ? { timeTo: u.timeTo } : {}),
    };
  } else if (allRoomsSelected && u.date) {
    draft = { guestCount: 1, date: u.date };
  }

  return { categoryId, selectedRoomId, allRoomsSelected, draft };
}

export type BookingFlowContextValue = {
  categoryId?: CategoryId;
  selectedRoomId?: string;
  allRoomsSelected: boolean;
  draft: BookingFlowDraft | null;
  setCategoryId: (id: CategoryId) => void;
  /** Первый заход: только «все бани», если ещё ничего не выбрано */
  ensureDefaultAllRoomsWhenEmpty: () => void;
  selectSpecificRoom: (room: WidgetRoom) => void;
  selectAllRooms: () => void;
  applyWeeklyRoomAndDate: (room: WidgetRoom, dateStr: string) => void;
  /** Выбор даты в месячном календаре — сбрасывает слот */
  setDraftDate: (dateStr: string) => void;
  /** Выбор слота — при смене интервала очищает доп. товары */
  setSlotFromPick: (slot: { timeFrom: string; timeTo: string; basePrice: number }) => void;
  clearSlotPick: () => void;
  patchDraft: (partial: Partial<BookingFlowDraft>) => void;
  /** Перед переходом на шаг 3 после смены слота */
  clearStep3Products: () => void;
};

const BookingFlowContext = createContext<BookingFlowContextValue | null>(null);

export function BookingFlowProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config?: WidgetGetResponse | null;
}) {
  const initial = useMemo(() => computeInitialFromUrl(), []);
  const [categoryId, setCategoryId] = useState<CategoryId | undefined>(initial.categoryId);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>(initial.selectedRoomId);
  const [allRoomsSelected, setAllRoomsSelected] = useState(initial.allRoomsSelected);
  const [draft, setDraft] = useState<BookingFlowDraft | null>(initial.draft);

  useEffect(() => {
    if (!config?.rooms?.length || !draft?.roomId || draft.roomName) return;
    const room = config.rooms.find((r) => r.id === draft.roomId);
    if (room) setDraft((d) => (d ? { ...d, roomName: room.name } : d));
  }, [config?.rooms, draft?.roomId, draft?.roomName]);

  const patchDraft = useCallback((partial: Partial<BookingFlowDraft>) => {
    setDraft((prev) => {
      const base: BookingFlowDraft = prev ?? { guestCount: partial.guestCount ?? 1 };
      return {
        ...base,
        ...partial,
        guestCount: partial.guestCount ?? base.guestCount ?? 1,
      };
    });
  }, []);

  const clearSlotInDraft = useCallback(() => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      delete next.timeFrom;
      delete next.timeTo;
      delete next.basePrice;
      return next;
    });
  }, []);

  const clearStep3Products = useCallback(() => {
    setDraft((prev) => (prev ? { ...prev, productQuantities: {} } : prev));
  }, []);

  const setCategoryIdCb = useCallback((id: CategoryId) => {
    setCategoryId(id);
  }, []);

  const ensureDefaultAllRoomsWhenEmpty = useCallback(() => {
    setAllRoomsSelected(true);
    setSelectedRoomId(undefined);
    setDraft((d) => d ?? { guestCount: 1 });
  }, []);

  const selectSpecificRoom = useCallback((room: WidgetRoom) => {
    setAllRoomsSelected(false);
    setSelectedRoomId(room.id);
    setDraft((prev) => {
      const changedRoom = prev?.roomId !== room.id;
      const next: BookingFlowDraft = {
        guestCount: prev?.guestCount ?? 1,
        ...preservedContacts(prev),
        roomId: room.id,
        roomName: room.name,
      };
      if (changedRoom) {
        next.productQuantities = {};
        delete next.timeFrom;
        delete next.timeTo;
        delete next.basePrice;
      } else {
        next.productQuantities = prev?.productQuantities ?? {};
      }
      return next;
    });
  }, []);

  const selectAllRooms = useCallback(() => {
    setAllRoomsSelected(true);
    setSelectedRoomId(undefined);
    setDraft((prev) => ({
      guestCount: prev?.guestCount ?? 1,
      ...preservedContacts(prev),
      productQuantities: {},
    }));
  }, []);

  const applyWeeklyRoomAndDate = useCallback((room: WidgetRoom, dateStr: string) => {
    setAllRoomsSelected(false);
    setSelectedRoomId(room.id);
    setDraft((prev) => {
      const sameRoom = prev?.roomId === room.id;
      return {
        guestCount: prev?.guestCount ?? 1,
        ...preservedContacts(prev),
        roomId: room.id,
        roomName: room.name,
        date: dateStr,
        timeFrom: undefined,
        timeTo: undefined,
        basePrice: undefined,
        productQuantities: sameRoom ? (prev?.productQuantities ?? {}) : {},
      };
    });
  }, []);

  const setDraftDate = useCallback((dateStr: string) => {
    setDraft((prev) => {
      const base: BookingFlowDraft = prev ?? { guestCount: 1 };
      const next: BookingFlowDraft = {
        ...base,
        date: dateStr,
        guestCount: base.guestCount ?? 1,
      };
      delete next.timeFrom;
      delete next.timeTo;
      delete next.basePrice;
      return next;
    });
  }, []);

  const setSlotFromPick = useCallback((slot: { timeFrom: string; timeTo: string; basePrice: number }) => {
    setDraft((prev) => {
      const base = prev ?? { guestCount: 1 };
      const changed =
        base.timeFrom !== slot.timeFrom || base.timeTo !== slot.timeTo || base.basePrice !== slot.basePrice;
      return {
        ...base,
        timeFrom: slot.timeFrom,
        timeTo: slot.timeTo,
        basePrice: slot.basePrice,
        productQuantities: changed ? {} : (base.productQuantities ?? {}),
      };
    });
  }, []);

  const clearSlotPick = useCallback(() => {
    clearSlotInDraft();
  }, [clearSlotInDraft]);

  const value = useMemo<BookingFlowContextValue>(
    () => ({
      categoryId,
      selectedRoomId,
      allRoomsSelected,
      draft,
      setCategoryId: setCategoryIdCb,
      ensureDefaultAllRoomsWhenEmpty,
      selectSpecificRoom,
      selectAllRooms,
      applyWeeklyRoomAndDate,
      setDraftDate,
      setSlotFromPick,
      clearSlotPick,
      patchDraft,
      clearStep3Products,
    }),
    [
      categoryId,
      selectedRoomId,
      allRoomsSelected,
      draft,
      setCategoryIdCb,
      ensureDefaultAllRoomsWhenEmpty,
      selectSpecificRoom,
      selectAllRooms,
      applyWeeklyRoomAndDate,
      setDraftDate,
      setSlotFromPick,
      clearSlotPick,
      patchDraft,
      clearStep3Products,
    ]
  );

  return <BookingFlowContext.Provider value={value}>{children}</BookingFlowContext.Provider>;
}

export function useBookingFlow(): BookingFlowContextValue {
  const ctx = useContext(BookingFlowContext);
  if (!ctx) throw new Error("useBookingFlow must be used within BookingFlowProvider");
  return ctx;
}
