import React from "react";
import { BOOKING_STEPS, getStepIndex, type BookingStepId } from "../types";

type BookingHeaderProps = {
  stepId: BookingStepId;
  title: string;
  onBack?: () => void;
  canGoBack?: boolean;
  /** Переход только на прошлые шаги (точки с индексом < текущего). */
  onStepClick?: (stepId: BookingStepId) => void;
};

/** Верхняя панель + индикатор шагов. Без корзины и авторизации (см. README). */
export const BookingHeader: React.FC<BookingHeaderProps> = ({
  stepId,
  title,
  onBack,
  canGoBack = false,
  onStepClick,
}) => {
  const index = getStepIndex(stepId);
  const total = BOOKING_STEPS.length;
  const stepNum = index + 1;

  return (
    <div>
      <header className="booking-header">
        <div className="booking-header__left">
          {canGoBack && (
            <button
              type="button"
              className="booking-header__back"
              onClick={onBack}
              aria-label="Назад"
            >
              ←
            </button>
          )}
          <p className="booking-header__step">
            Шаг {stepNum} из {total}
          </p>
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
