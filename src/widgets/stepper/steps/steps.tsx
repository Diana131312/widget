import { BookingStepCheckout, BookingStepProducts } from "./booking-step-three";
import type { StepperState } from "../types";
import { StepCategory } from "./StepCategory";
import { StepBanyaObject } from "./StepBanyaObject";
import type { StepDefinition } from "./stepTypes";

const canEnterBookingFlow = (state: StepperState) =>
  !!state.data.bookingDraft?.roomId &&
  !!state.data.bookingDraft?.date &&
  !!state.data.bookingDraft?.timeFrom;

export function createStepperSteps(): StepDefinition[] {
  return [
    {
      id: "category",
      title: "Категория",
      Component: StepCategory,
    },
    {
      id: "banyaObject",
      title: "Баня",
      canEnter: (state) => state.data.categoryId === "banya",
      Component: StepBanyaObject,
    },
    {
      id: "bookingStepThree",
      title: "Доп. товары",
      canEnter: canEnterBookingFlow,
      Component: BookingStepProducts,
    },
    {
      id: "bookingStepFour",
      title: "Оформление",
      canEnter: canEnterBookingFlow,
      Component: BookingStepCheckout,
    },
  ];
}

