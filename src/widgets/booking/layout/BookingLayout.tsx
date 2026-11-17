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
  /** Номер в подписи «Шаг N из M», если сценарий идёт своим порядком */
  stepNumber?: number;
  /** Знаменатель «из M», если сценарий короче брони */
  stepTotal?: number;
  onStepClick?: (stepId: BookingStepId) => void;
  /** ФИ авторизованного клиента в шапке */
  userLabel?: string | null;
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
  stepNumber,
  stepTotal,
  onStepClick,
  userLabel,
  children,
}) => {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [stepId, stepNumber, stepTotal]);

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
        stepNumber={stepNumber}
        stepTotal={stepTotal}
        onStepClick={onStepClick}
        userLabel={userLabel}
      />
      <main className="booking-layout__main">{children}</main>
    </div>
  );
};
