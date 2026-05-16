import { BookingStepCheckout, BookingStepSetup } from "./booking-step-three";
import type { StepperBookingGate, StepperState } from "../types";
import { canEnterBookingSetup, completeBookingDraft } from "../types";
import { StepCategory } from "./StepCategory";
import { StepBanyaObject } from "./StepBanyaObject";
import { StepHomesObject } from "./StepHomesObject";
import { StepBanyaTestObject } from "./StepBanyaTestObject";
import { StepAddServices } from "./StepAddServices";
import type { StepDefinition } from "./stepTypes";

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
      canEnter: (_state, gate) => gate.categoryId === "banya",
      Component: StepBanyaObject,
    },
    {
      id: "homesObject",
      title: "Выбор дома",
      canEnter: (_state, gate) => gate.categoryId === "homes",
      Component: StepHomesObject,
    },
    {
      id: "banyaTestObject",
      title: "Выбор бани",
      canEnter: (_state, gate) => gate.categoryId === "banyaTest",
      Component: StepBanyaTestObject,
    },
    {
      id: "bookingStepThree",
      title: "Настройка бронирования",
      canEnter: (_state, gate) => canEnterBookingSetup(gate.categoryId, gate.draft),
      Component: BookingStepSetup,
    },
    {
      id: "addServices",
      title: "Выбор услуг",
      canEnter: () => true,
      Component: StepAddServices,
    },
    {
      id: "bookingStepFive",
      title: "Оформление заказа",
      canEnter: (_state, gate) => gate.cartCount > 0,
      Component: BookingStepCheckout,
    },
  ];
}
