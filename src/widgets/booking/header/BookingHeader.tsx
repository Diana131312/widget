import React from "react";
import { Home } from "lucide-react";
import { BOOKING_STEPS, getStepIndex, type BookingStepId } from "../types";

type BookingHeaderProps = {
  stepId: BookingStepId;
  /** Оставлено для совместимости; в шапке больше не показываем название шага. */
  title?: string;
  onBack?: () => void;
  canGoBack?: boolean;
  /** Режим одной карточки: иконка «домой» → шаг 1 */
  showHome?: boolean;
  onHome?: () => void;
  /** Скрыть «Шаг N из M» (фокус на одну карточку) */
  hideStepLabel?: boolean;
  /** @deprecated Точки шагов убраны */
  onStepClick?: (stepId: BookingStepId) => void;
};

/** Верхняя панель: назад/домой + «Шаг N из M». */
export const BookingHeader: React.FC<BookingHeaderProps> = ({
  stepId,
  onBack,
  canGoBack = false,
  showHome = false,
  onHome,
  hideStepLabel = false,
}) => {
  const index = getStepIndex(stepId);
  const total = BOOKING_STEPS.length;
  const stepNum = index + 1;

  return (
    <header className="booking-header">
      <div className="booking-header__left">
        {showHome && onHome ? (
          <button
            type="button"
            className="booking-header__home"
            onClick={onHome}
            aria-label="На главную"
            title="На главную"
          >
            <Home size={18} aria-hidden strokeWidth={2.25} />
          </button>
        ) : canGoBack ? (
          <button
            type="button"
            className="booking-header__back"
            onClick={onBack}
            aria-label="Назад"
          >
            ←
          </button>
        ) : null}
        {!hideStepLabel ? (
          <p className="booking-header__step">
            Шаг {stepNum} из {total}
          </p>
        ) : null}
      </div>
    </header>
  );
};
