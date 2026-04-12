export type StepId = "category" | "banyaObject";

export type CategoryId = "banya" | "homes";

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
};

export type StepperState = {
  stepId: StepId;
  data: StepperData;
};

export type CategoryDefinition = {
  id: CategoryId;
  label: string;
};

