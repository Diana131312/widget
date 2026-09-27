import React, { useEffect } from "react";
import { BookingHeader } from "../header/BookingHeader";
import type { BookingStepId } from "../types";

type BookingLayoutProps = {
  stepId: BookingStepId;
  title: string;
  onBack?: () => void;
  canGoBack?: boolean;
  showHome?: boolean;
  onHome?: () => void;
  hideStepLabel?: boolean;
  onStepClick?: (stepId: BookingStepId) => void;
  children: React.ReactNode;
};

/** Каркас виджета: одна карточка (max-width на `.bk-widget`). */
export const BookingLayout: React.FC<BookingLayoutProps> = ({
  stepId,
  title,
  onBack,
  canGoBack,
  showHome,
  onHome,
  hideStepLabel,
  onStepClick,
  children,
}) => {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [stepId]);

  return (
    <div className="booking-layout">
      <BookingHeader
        stepId={stepId}
        title={title}
        onBack={onBack}
        canGoBack={canGoBack}
        showHome={showHome}
        onHome={onHome}
        hideStepLabel={hideStepLabel}
        onStepClick={onStepClick}
      />
      <main className="booking-layout__main">{children}</main>
    </div>
  );
};
