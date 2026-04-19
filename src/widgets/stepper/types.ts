export type StepId = "category" | "banyaObject" | "bookingStepThree" | "bookingStepFour";

export type CategoryId = "banya" | "homes";

/**
 * Единое хранилище черновика бронирования (шаги 2–4).
 * Поля слота/цены опциональны до завершения выбора на шаге 2.
 */
export type BookingFlowDraft = {
  roomId?: string;
  roomName?: string;
  /** yyyy-MM-dd */
  date?: string;
  timeFrom?: string;
  timeTo?: string;
  basePrice?: number;
  guestCount: number;
  /** productId → количество */
  productQuantities?: Record<string, number>;
  contactFullName?: string;
  contactPhone?: string;
  comment?: string;
};

/** Черновик с обязательными полями для шагов 3–4 и API */
export type BookingDraft = {
  roomId: string;
  roomName: string;
  /** yyyy-MM-dd */
  date: string;
  timeFrom: string;
  timeTo: string;
  basePrice: number;
  guestCount: number;
  /** productId → количество */
  productQuantities?: Record<string, number>;
  contactFullName?: string;
  contactPhone?: string;
  comment?: string;
};

export function completeBookingDraft(d: BookingFlowDraft | null): BookingDraft | null {
  if (!d?.roomId || !d.roomName || !d.date || !d.timeFrom || !d.timeTo || d.basePrice == null) return null;
  return {
    roomId: d.roomId,
    roomName: d.roomName,
    date: d.date,
    timeFrom: d.timeFrom,
    timeTo: d.timeTo,
    basePrice: d.basePrice,
    guestCount: Math.max(1, d.guestCount || 1),
    productQuantities: d.productQuantities ?? {},
    contactFullName: d.contactFullName,
    contactPhone: d.contactPhone,
    comment: d.comment,
  };
}

export type StepperData = {
  /** Ответ GET /settings/{alias} */
  settings?: import("../../api").WidgetThemeSettingsResponse;
  /** Ответ GET /get/{alias} */
  config?: import("../../api").WidgetGetResponse;
};

export type StepperState = {
  stepId: StepId;
  data: StepperData;
};

/** Данные для canEnter шагов (живут в BookingFlowContext, не в StepperState) */
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

