import type { StepId, StepperBookingGate, StepperState } from "../types";
import type { UserInfoResponse } from "../../../api";

export type StepProps = {
  state: StepperState;
  setState: (next: StepperState) => void;
  goTo: (stepId: StepId) => void;
  /** Callback для показа Toast/SnackBar (опционально) */
  onShowToast?: (message: string) => void;
  /** Alias для API запросов */
  alias?: string;
  /** Обновить auth состояние после подтверждения кода */
  onAuthResolved?: (args: { token: string | null; userInfo: UserInfoResponse }) => void;
  /** Открыть экран личного кабинета (история бронирований) */
  onOpenCabinet?: () => void;
};

export type StepDefinition = {
  id: StepId;
  title: string;
  Component: React.FC<StepProps>;
  /** Условие, можно ли зайти на шаг (для гардов по данным). */
  canEnter?: (state: StepperState, booking: StepperBookingGate) => boolean;
};

