export type BookingCategoryId = "homes" | "banya";

export type BookingStepId =
  | "category"
  | "object"
  | "setup"
  | "extras" // зарезервирован; временно скрыт из UI (setup → checkout)
  | "checkout";

/** Видимые шаги степпера. extras исключён до мультикорзины. */
export const BOOKING_STEPS: { id: BookingStepId; title: string }[] = [
  { id: "category", title: "Категория" },
  { id: "object", title: "Объект" },
  { id: "setup", title: "Параметры" },
  { id: "checkout", title: "Оформление" },
];

export function getStepIndex(stepId: BookingStepId): number {
  if (stepId === "extras") {
    // временно: extras ≡ checkout для прогресса
    return getStepIndex("checkout");
  }
  const idx = BOOKING_STEPS.findIndex((s) => s.id === stepId);
  return idx >= 0 ? idx : 0;
}
