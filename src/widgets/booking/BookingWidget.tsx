import React, { useEffect, useMemo, useRef, useState } from "react";
import "./booking.css";
import { createWidgetApi } from "../../api";
import { useBookingBootstrap } from "./bootstrap/useBookingBootstrap";
import { BOOKING_ALIAS } from "./constants";
import { BookingLayout } from "./layout/BookingLayout";
import { StepCategory } from "./steps/StepCategory";
import { StepObject } from "./steps/StepObject";
import { StepSetup } from "./steps/StepSetup";
import { BootstrapError } from "./ui/BootstrapError";
import { BookingLoader } from "./ui/BookingLoader";
import { BookingToastProvider, useBookingToast } from "./ui/ToastContext";
import { useBookingFlow } from "./useBookingFlow";
import {
  parseBookingUrl,
  writeBookingUrl,
  type BookingUrlState,
} from "./url/bookingUrl";
import { validateBookingUrl } from "./url/validateBookingUrl";

function BookingWidgetInner() {
  const { showToast } = useBookingToast();
  const urlCandidate = useMemo(() => parseBookingUrl(), []);
  const api = useMemo(() => createWidgetApi({ alias: BOOKING_ALIAS }), []);

  const {
    stepId,
    categoryId,
    roomId,
    checkIn,
    checkOut,
    banyaDate,
    banyaTimeFrom,
    banyaTimeTo,
    slotDuration,
    slotPrice,
    guestCount,
    productQuantities,
    basePrice,
    title,
    canGoBack,
    selectCategory,
    selectHome,
    selectBanya,
    setGuestCount,
    setProductQty,
    setBasePriceResolved,
    continueFromSetup,
    back,
    goToStep,
    hydrate,
  } = useBookingFlow({
    initial: urlCandidate,
    onPersist: writeBookingUrl,
  });

  const { config, isBlocking, needsConfig, status, error, reload } =
    useBookingBootstrap({ stepId });

  const [urlReady, setUrlReady] = useState(
    () => urlCandidate.stepId === "category"
  );
  const validatedRef = useRef(false);

  useEffect(() => {
    if (validatedRef.current) return;
    if (urlCandidate.stepId === "category") {
      validatedRef.current = true;
      setUrlReady(true);
      writeBookingUrl(urlCandidate);
      return;
    }
    if (status !== "ready" || !config) return;

    let cancelled = false;
    validatedRef.current = true;

    void validateBookingUrl(urlCandidate, config, api).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        hydrate(result.state);
        writeBookingUrl(result.state);
        showToast(result.reason);
      } else {
        // slotMeta с matched-слота — иначе F5/deep-link теряет duration/price
        hydrate(result.state, result.slotMeta ?? null);
        writeBookingUrl(result.state);
      }
      setUrlReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [api, config, status, urlCandidate, hydrate, showToast]);

  const waitingUrl =
    !urlReady && urlCandidate.stepId !== "category" && status !== "error";

  let body: React.ReactNode;
  if (isBlocking || waitingUrl) {
    body = <BookingLoader />;
  } else if (needsConfig && status === "error") {
    body = <BootstrapError error={error} onRetry={reload} />;
  } else {
    body = (
      <>
        {stepId === "category" && <StepCategory onSelect={selectCategory} />}
        {stepId === "object" && categoryId && config && (
          <StepObject
            categoryId={categoryId}
            config={config}
            onSelectHome={selectHome}
            onSelectBanya={selectBanya}
          />
        )}
        {stepId === "setup" && categoryId && config && roomId && (
          <StepSetup
            categoryId={categoryId}
            config={config}
            roomId={roomId}
            checkIn={checkIn}
            checkOut={checkOut}
            banyaDate={banyaDate}
            banyaTimeFrom={banyaTimeFrom}
            banyaTimeTo={banyaTimeTo}
            slotDuration={slotDuration}
            slotPrice={slotPrice}
            guestCount={guestCount}
            productQuantities={productQuantities}
            basePrice={basePrice}
            onGuestCountChange={setGuestCount}
            onSetProductQty={setProductQty}
            onBasePriceResolved={setBasePriceResolved}
            onContinue={continueFromSetup}
          />
        )}
        {stepId === "extras" && (
          <p className="booking-header__step">
            Дополнительные услуги — следующий шаг миграции.
          </p>
        )}
      </>
    );
  }

  return (
    <div className="bk-widget">
      <BookingLayout
        stepId={stepId}
        title={title}
        canGoBack={canGoBack}
        onBack={back}
        onStepClick={goToStep}
      >
        {body}
      </BookingLayout>
    </div>
  );
}

/**
 * Чистый MVP-виджет бронирования (точка входа для App.booking).
 */
export function BookingWidget() {
  return (
    <BookingToastProvider>
      <BookingWidgetInner />
    </BookingToastProvider>
  );
}

export type { BookingUrlState };
