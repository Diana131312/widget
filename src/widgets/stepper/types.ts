export type StepId = "category" | "banyaObject" | "bookingStepThree" | "bookingStepFour";

export type CategoryId = "banya" | "homes";

/** Черновик бронирования после выбора слота (шаг 2 → 3) */
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

export type StepperData = {
  categoryId?: CategoryId;
  /** Ответ GET /settings/{alias} */
  settings?: import("../../api").WidgetThemeSettingsResponse;
  /** Ответ GET /get/{alias} */
  config?: import("../../api").WidgetGetResponse;
  /** ID выбранной бани (если выбрана конкретная баня) */
  selectedRoomId?: string;
  /** Флаг выбора "Все бани" */
  allRoomsSelected?: boolean;
  /** Данные для шага оформления (доп. товары, контакты) */
  bookingDraft?: BookingDraft;
};

export type StepperState = {
  stepId: StepId;
  data: StepperData;
};

export type CategoryDefinition = {
  id: CategoryId;
  label: string;
};

