export type BookingCategoryId = "homes" | "banya";

export type BookingStepId =
  | "category"
  | "object"
  | "setup"
  | "extras"
  | "checkout";

export const BOOKING_STEPS: { id: BookingStepId; title: string }[] = [
  { id: "category", title: "Категория" },
  { id: "object", title: "Объект" },
  { id: "setup", title: "Параметры" },
  { id: "extras", title: "Дополнительно" },
  { id: "checkout", title: "Оформление" },
];

export function getStepIndex(stepId: BookingStepId): number {
  const idx = BOOKING_STEPS.findIndex((s) => s.id === stepId);
  return idx >= 0 ? idx : 0;
}
