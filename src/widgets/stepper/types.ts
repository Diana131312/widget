export type StepId =
  | "category"
  | "banyaObject"
  | "homesObject"
  | "bookingStepThree"
  | "bookingStepFour";

export type CategoryId = "banya" | "homes";

/**
 * Единое хранилище черновика бронирования (шаги 2–4).
 */
export type BookingFlowDraft = {
  roomId?: string;
  roomName?: string;
  /** yyyy-MM-dd — баня */
  date?: string;
  timeFrom?: string;
  timeTo?: string;
  /** Длительность слота в часах (для calculate) */
  slotDuration?: number;
  /** Посуточное бронирование */
  checkInDate?: string;
  checkOutDate?: string;
  basePrice?: number;
  /** 0 до ввода на шаге «Настройка бронирования» */
  guestCount: number;
  productQuantities?: Record<string, number>;
  contactFullName?: string;
  contactPhone?: string;
  comment?: string;
};

/** Черновик с обязательными полями для шага 4 и API */
export type BookingDraft = {
  roomId: string;
  roomName: string;
  guestCount: number;
  basePrice: number;
  productQuantities?: Record<string, number>;
  date?: string;
  timeFrom?: string;
  timeTo?: string;
  checkInDate?: string;
  checkOutDate?: string;
  contactFullName?: string;
  contactPhone?: string;
  comment?: string;
};

export function hasBanyaSlotSelection(d: BookingFlowDraft | null | undefined): boolean {
  return Boolean(d?.roomId && d.roomName && d.date && d.timeFrom && d.timeTo);
}

export function hasHomesDateSelection(d: BookingFlowDraft | null | undefined): boolean {
  return Boolean(d?.roomId && d.roomName && d.checkInDate && d.checkOutDate);
}

/** Можно войти на шаг 3 «Настройка бронирования» */
export function canEnterBookingSetup(
  categoryId: CategoryId | undefined,
  d: BookingFlowDraft | null | undefined
): boolean {
  if (!categoryId || !d) return false;
  if (categoryId === "banya") return hasBanyaSlotSelection(d);
  if (categoryId === "homes") return hasHomesDateSelection(d);
  return false;
}

/** Можно войти на шаг 4 «Оформление» */
export function completeBookingDraft(
  d: BookingFlowDraft | null | undefined,
  categoryId: CategoryId | undefined
): BookingDraft | null {
  if (!canEnterBookingSetup(categoryId, d)) return null;
  if (!d?.guestCount || d.guestCount < 1 || d.basePrice == null) return null;

  const base = {
    roomId: d.roomId!,
    roomName: d.roomName!,
    guestCount: d.guestCount,
    basePrice: d.basePrice,
    productQuantities: d.productQuantities ?? {},
    contactFullName: d.contactFullName,
    contactPhone: d.contactPhone,
    comment: d.comment,
  };

  if (categoryId === "banya" && d.date && d.timeFrom && d.timeTo) {
    return { ...base, date: d.date, timeFrom: d.timeFrom, timeTo: d.timeTo };
  }

  if (categoryId === "homes" && d.checkInDate && d.checkOutDate) {
    return {
      ...base,
      checkInDate: d.checkInDate,
      checkOutDate: d.checkOutDate,
    };
  }

  return null;
}

export type StepperData = {
  settings?: import("../../api").WidgetThemeSettingsResponse;
  config?: import("../../api").WidgetGetResponse;
};

export type StepperState = {
  stepId: StepId;
  data: StepperData;
};

export type StepperBookingGate = {
  categoryId?: CategoryId;
  selectedRoomId?: string;
  allRoomsSelected: boolean;
  draft: BookingFlowDraft | null;
};

export type CategoryDefinition = {
  id: CategoryId;
  label: string;
};
