import React from "react";
import { BookingHeader } from "../header/BookingHeader";
import type { BookingStepId } from "../types";

type BookingLayoutProps = {
  stepId: BookingStepId;
  title: string;
  onBack?: () => void;
  canGoBack?: boolean;
  onStepClick?: (stepId: BookingStepId) => void;
  children: React.ReactNode;
};

/** Каркас виджета: одна карточка (max-width на `.bk-widget`). */
export const BookingLayout: React.FC<BookingLayoutProps> = ({
  stepId,
  title,
  onBack,
  canGoBack,
  onStepClick,
  children,
}) => {
  return (
    <div className="booking-layout">
      <BookingHeader
        stepId={stepId}
        title={title}
        onBack={onBack}
        canGoBack={canGoBack}
        onStepClick={onStepClick}
      />
      <main className="booking-layout__main">{children}</main>
    </div>
  );
};
