import React from "react";
import { BookingHeader } from "../header/BookingHeader";
import type { BookingStepId } from "../types";

type BookingLayoutProps = {
  stepId: BookingStepId;
  title: string;
  onBack?: () => void;
  canGoBack?: boolean;
  children: React.ReactNode;
};

/** Каркас виджета: одна карточка (max-width на `.booking-widget`). */
export const BookingLayout: React.FC<BookingLayoutProps> = ({
  stepId,
  title,
  onBack,
  canGoBack,
  children,
}) => {
  return (
    <div className="booking-layout">
      <BookingHeader
        stepId={stepId}
        title={title}
        onBack={onBack}
        canGoBack={canGoBack}
      />
      <main className="booking-layout__main">{children}</main>
    </div>
  );
};
