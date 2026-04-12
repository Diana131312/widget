import type { StepId, StepperState } from "../types";

export type StepProps = {
  state: StepperState;
  setState: (next: StepperState) => void;
  goTo: (stepId: StepId) => void;
  /** Callback для показа Toast/SnackBar (опционально) */
  onShowToast?: (message: string) => void;
  /** Alias для API запросов */
  alias?: string;
};

export type StepDefinition = {
  id: StepId;
  title: string;
  Component: React.FC<StepProps>;
  /** Условие, можно ли зайти на шаг (для гардов по данным). */
  canEnter?: (state: StepperState) => boolean;
};

