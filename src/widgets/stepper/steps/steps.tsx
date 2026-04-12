import React from "react";
import { StepCategory } from "./StepCategory";
import { StepBanyaObject } from "./StepBanyaObject";
import type { StepDefinition } from "./stepTypes";

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
  ];
}

