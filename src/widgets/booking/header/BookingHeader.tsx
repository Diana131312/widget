import React from "react";
import { Home } from "lucide-react";
import { BOOKING_STEPS, getStepIndex, type BookingStepId } from "../types";

type BookingHeaderProps = {
  stepId: BookingStepId;
  title: string;
  onBack?: () => void;
  canGoBack?: boolean;
  /** Режим одной карточки: иконка «домой» → шаг 1 */
  showHome?: boolean;
  onHome?: () => void;
  /** Скрыть «Шаг N из M» (фокус на одну карточку) */
  hideStepLabel?: boolean;
  /** Переход только на прошлые шаги (точки с индексом < текущего). */
  onStepClick?: (stepId: BookingStepId) => void;
};

/** Верхняя панель + индикатор шагов. Без корзины и авторизации (см. README). */
export const BookingHeader: React.FC<BookingHeaderProps> = ({
  stepId,
  title,
  onBack,
  canGoBack = false,
  showHome = false,
  onHome,
  hideStepLabel = false,
  onStepClick,
}) => {
  const index = getStepIndex(stepId);
  const total = BOOKING_STEPS.length;
  const stepNum = index + 1;

  return (
    <div>
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
        <h2 className="booking-header__title">{title}</h2>
      </header>

      <nav className="booking-steps" aria-label="Прогресс бронирования">
        {BOOKING_STEPS.map((step, i) => {
          const done = i < index;
          const current = i === index;
          const className = [
            "booking-steps__dot",
            done ? "booking-steps__dot--done" : "",
            current ? "booking-steps__dot--current" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <React.Fragment key={step.id}>
              {i > 0 && (
                <span
                  className={
                    done || current
                      ? "booking-steps__line booking-steps__line--done"
                      : "booking-steps__line"
                  }
                  aria-hidden
                />
              )}
              {done ? (
                <button
                  type="button"
                  className={className}
                  title={step.title}
                  aria-label={`Шаг: ${step.title}`}
                  onClick={() => onStepClick?.(step.id)}
                />
              ) : (
                <span
                  className={className}
                  title={step.title}
                  aria-label={`Шаг: ${step.title}`}
                  aria-current={current ? "step" : undefined}
                />
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
};
