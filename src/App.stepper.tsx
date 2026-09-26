import React from "react";
import { StepperWidget } from "./widgets";

/** Dev-сборка старого виджета (`pnpm dev:stepper`). Не использовать в production build. */
export const App: React.FC = () => {
  return (
    <div className="app-shell">
      <StepperWidget alias="les" title="Stepper Widget" />
    </div>
  );
};
