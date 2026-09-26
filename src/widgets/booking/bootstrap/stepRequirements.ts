import type { BookingStepId } from "../types";

/**
 * Какие данные нужны шагу для отображения.
 * Расширяйте по мере появления новых зависимостей (не привязывайтесь к «номеру шага»).
 */
export type StepDataNeeds = {
  /** Нужен ответ GET /widget/get/{alias} */
  config?: boolean;
};

export const STEP_DATA_NEEDS: Record<BookingStepId, StepDataNeeds> = {
  category: {},
  object: { config: true },
  setup: { config: true },
  extras: { config: true },
  checkout: { config: true },
};

export function stepNeedsConfig(stepId: BookingStepId): boolean {
  return Boolean(STEP_DATA_NEEDS[stepId]?.config);
}
