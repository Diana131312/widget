import type { CategoryId, StepId } from "../types";

/** Шаги, видимые в текущем сценарии (баня или дома). */
export function getFlowStepIds(categoryId: CategoryId | undefined): StepId[] {
  const steps: StepId[] = ["category"];
  if (categoryId === "banya") {
    steps.push("banyaObject");
  } else if (categoryId === "homes") {
    steps.push("homesObject");
  }
  if (categoryId) {
    steps.push("bookingStepThree", "bookingStepFour");
  }
  return steps;
}

export function getFlowStepIndex(
  stepId: StepId,
  categoryId: CategoryId | undefined
): number {
  const flow = getFlowStepIds(categoryId);
  const idx = flow.indexOf(stepId);
  return idx >= 0 ? idx : 0;
}

export function getPrevFlowStepId(
  stepId: StepId,
  categoryId: CategoryId | undefined
): StepId | null {
  const flow = getFlowStepIds(categoryId);
  const idx = flow.indexOf(stepId);
  if (idx <= 0) return null;
  return flow[idx - 1] ?? null;
}

export function getObjectStepId(categoryId: CategoryId | undefined): StepId | null {
  if (categoryId === "banya") return "banyaObject";
  if (categoryId === "homes") return "homesObject";
  return null;
}
