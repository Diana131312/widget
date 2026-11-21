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
  /** Номер шага в текущем сценарии, если он не совпадает с индексом брони */
  stepNumber?: number;
  /** Сколько шагов в подписи «Шаг N из M», если сценарий короче брони */
  stepTotal?: number;
  /** Короткая подпись справа от счётчика, например вид сертификата */
  stepNote?: string | null;
  /** @deprecated Точки шагов убраны */
  onStepClick?: (stepId: BookingStepId) => void;
  /** ФИ авторизованного клиента (справа) */
  userLabel?: string | null;
};

/** Верхняя панель: назад/домой + «Шаг N из M». */
export const BookingHeader: React.FC<BookingHeaderProps> = ({
  stepId,
  onBack,
  canGoBack = false,
  showHome = false,
  onHome,
  hideStepLabel = false,
  stepNumber,
  stepTotal,
  stepNote = null,
  userLabel = null,
}) => {
  const index = getStepIndex(stepId);
  const total = stepTotal ?? BOOKING_STEPS.length;
  const stepNum = stepNumber ?? index + 1;

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
            Шаг {stepNum}
            {stepNum > 1 ? ` из ${total}` : null}
            {stepNote ? (
              <span className="booking-header__step-note">{stepNote}</span>
            ) : null}
          </p>
        ) : null}
      </div>
      {userLabel ? (
        <p className="booking-header__user" title={userLabel}>
          {userLabel}
        </p>
      ) : null}
    </header>
  );
};
