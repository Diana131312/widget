import React from "react";
import "./booking.css";
import { getCategoryConfig } from "./categories";
import { BookingLayout } from "./layout/BookingLayout";
import { StepCategory } from "./steps/StepCategory";
import { useBookingFlow } from "./useBookingFlow";

/**
 * Чистый MVP-виджет бронирования (точка входа для App.booking).
 */
export function BookingWidget() {
  const { stepId, categoryId, title, canGoBack, selectCategory, back } =
    useBookingFlow();

  return (
    <div className="booking-widget">
      <BookingLayout
        stepId={stepId}
        title={title}
        canGoBack={canGoBack}
        onBack={back}
      >
        {stepId === "category" && <StepCategory onSelect={selectCategory} />}
        {stepId === "object" && (
          <p className="booking-header__step">
            Выбор объекта (
            {categoryId
              ? getCategoryConfig(categoryId)?.caption.toLowerCase()
              : "…"}
            ) — следующий шаг миграции.
          </p>
        )}
      </BookingLayout>
    </div>
  );
}
