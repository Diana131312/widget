import { BookingStepCheckout, BookingStepProducts } from "./booking-step-three";
import type { StepperBookingGate, StepperState } from "../types";
import { completeBookingDraft } from "../types";
import { StepCategory } from "./StepCategory";
import { StepBanyaObject } from "./StepBanyaObject";
import type { StepDefinition } from "./stepTypes";

const canEnterBookingFlow = (_state: StepperState, gate: StepperBookingGate) =>
  completeBookingDraft(gate.draft) != null;

export function createStepperSteps(): StepDefinition[] {
  return [
    {
      id: "category",
      title: "Формат отдыха",
      Component: StepCategory,
    },
    {
      id: "banyaObject",
      title: "Выбор даты и времени",
      canEnter: (state, gate) => gate.categoryId === "banya",
      Component: StepBanyaObject,
    },
    {
      id: "bookingStepThree",
      title: "Дополнительные товары",
      canEnter: canEnterBookingFlow,
      Component: BookingStepProducts,
    },
    {
      id: "bookingStepFour",
      title: "Оформление заказа",
      canEnter: canEnterBookingFlow,
      Component: BookingStepCheckout,
    },
  ];
}
