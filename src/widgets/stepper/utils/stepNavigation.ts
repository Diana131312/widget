import type { CategoryId, StepId } from "../types";

const GLOBAL_STEPS: StepId[] = [
  "category",
  "banyaObject",
  "homesObject",
  "banyaTestObject",
  "bookingStepThree",
  "addServices",
  "bookingStepFive",
];

const OBJECT_STEP_IDS: StepId[] = ["banyaObject", "homesObject", "banyaTestObject"];

export function getGlobalStepNumber(stepId: StepId): number {
  if (stepId === "category") return 1;
  if (OBJECT_STEP_IDS.includes(stepId)) return 2;
  if (stepId === "bookingStepThree") return 3;
  if (stepId === "addServices") return 4;
  if (stepId === "bookingStepFive") return 5;
  return 1;
}

export const GLOBAL_STEP_TOTAL = 5;

/** Шаги сценария одного бронирования (категория → объект → настройка). */
export function getFlowStepIds(categoryId: CategoryId | undefined): StepId[] {
  const steps: StepId[] = ["category"];
  if (categoryId === "banya") {
    steps.push("banyaObject");
  } else if (categoryId === "homes") {
    steps.push("homesObject");
  } else if (categoryId === "banyaTest") {
    steps.push("banyaTestObject");
  }
  if (categoryId) {
    steps.push("bookingStepThree");
  }
  return steps;
}

export function getFlowStepIndex(
  stepId: StepId,
  categoryId: CategoryId | undefined
): number {
  if (stepId === "addServices" || stepId === "bookingStepFive") {
    return getGlobalStepNumber(stepId) - 1;
  }
  const flow = getFlowStepIds(categoryId);
  const idx = flow.indexOf(stepId);
  return idx >= 0 ? idx : 0;
}

export function getPrevFlowStepId(
  stepId: StepId,
  categoryId: CategoryId | undefined,
  cartCount = 0
): StepId | null {
  if (stepId === "bookingStepFive") {
    return cartCount > 0 ? "addServices" : null;
  }
  if (stepId === "addServices") {
    return "category";
  }

  const flow = getFlowStepIds(categoryId);
  const idx = flow.indexOf(stepId);
  if (idx <= 0) return null;
  return flow[idx - 1] ?? null;
}

export function getObjectStepId(categoryId: CategoryId | undefined): StepId | null {
  if (categoryId === "banya") return "banyaObject";
  if (categoryId === "homes") return "homesObject";
  if (categoryId === "banyaTest") return "banyaTestObject";
  return null;
}

export function isGlobalCartStep(stepId: StepId): boolean {
  return stepId === "addServices" || stepId === "bookingStepFive";
}

export { GLOBAL_STEPS };
