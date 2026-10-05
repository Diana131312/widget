export type BookingCategoryId = "homes" | "banya";

export type BookingStepId =
  | "category"
  | "object"
  | "setup"
  | "extras" // зарезервирован; временно скрыт из UI (setup → checkout)
  | "checkout"
  | "verify"
  | "done";

/** Видимые шаги в счётчике «Шаг N из K». */
export const BOOKING_STEPS: { id: BookingStepId; title: string }[] = [
  { id: "category", title: "Категория" },
  { id: "object", title: "Объект" },
  { id: "setup", title: "Параметры" },
  { id: "checkout", title: "Оформление" },
  { id: "verify", title: "Подтверждение" },
  { id: "done", title: "Готово" },
];

export function getStepIndex(stepId: BookingStepId): number {
  if (stepId === "extras") {
    return getStepIndex("checkout");
  }
  const idx = BOOKING_STEPS.findIndex((s) => s.id === stepId);
  return idx >= 0 ? idx : 0;
}

/** Шаги оформления и после него (гости/товары в URL). */
export function isCheckoutLikeStep(stepId: BookingStepId): boolean {
  return (
    stepId === "setup" ||
    stepId === "extras" ||
    stepId === "checkout" ||
    stepId === "verify" ||
    stepId === "done"
  );
}
