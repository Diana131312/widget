import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./booking.css";
import { createWidgetApi } from "../../api";
import { useBookingBootstrap } from "./bootstrap/useBookingBootstrap";
import { BOOKING_ALIAS } from "./constants";
import { BookingLayout } from "./layout/BookingLayout";
import { StepCategory } from "./steps/StepCategory";
import { StepCheckout } from "./steps/StepCheckout";
import { StepDone } from "./steps/StepDone";
import { StepObject } from "./steps/StepObject";
import { StepSetup } from "./steps/StepSetup";
import { StepVerify } from "./steps/StepVerify";
import { BootstrapError } from "./ui/BootstrapError";
import { BookingLoader } from "./ui/BookingLoader";
import { DeepLinkIssue } from "./ui/DeepLinkIssue";
import { BookingToastProvider, useBookingToast } from "./ui/ToastContext";
import { useBookingFlow } from "./useBookingFlow";
import {
  parseBookingUrl,
  rememberBookingUrlNavKey,
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
    objectFocus,
    selectCategory,
    selectHome,
    selectBanya,
    setGuestCount,
    setProductQty,
    setBasePriceResolved,
    continueFromSetup,
    continueFromCheckout,
    completeBooking,
    startOver,
    back,
    showAllObjects,
    goToStep,
    hydrate,
    contactDraft,
    bookingResult,
    calcMeta,
  } = useBookingFlow({
    initial: urlCandidate,
    onPersist: (state) => {
      // done заменяет verify в истории → браузерный «назад» сразу на checkout
      writeBookingUrl(state, {
        mode: state.stepId === "done" ? "replace" : "auto",
      });
    },
  });

  const { config, isBlocking, needsConfig, status, error, reload } =
    useBookingBootstrap({ stepId });

  const [urlReady, setUrlReady] = useState(
    () => urlCandidate.stepId === "category"
  );
  const [linkIssue, setLinkIssue] = useState<{
    message: string;
    actionLabel: string;
  } | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const validatedRef = useRef(false);
  const configRef = useRef(config);
  configRef.current = config;

  const applyUrlCandidate = useCallback(
    async (candidate: BookingUrlState, opts?: { replaceUrl?: boolean }) => {
      const replaceUrl = opts?.replaceUrl ?? true;
      const cfg = configRef.current;

      if (candidate.stepId === "category" || !cfg) {
        hydrate(candidate);
        rememberBookingUrlNavKey(candidate);
        if (replaceUrl) writeBookingUrl(candidate, { mode: "replace" });
        else rememberBookingUrlNavKey(candidate);
        setLinkIssue(null);
        return;
      }

      const result = await validateBookingUrl(candidate, cfg, api);
      if (!result.ok) {
        hydrate(result.state);
        rememberBookingUrlNavKey(result.state);
        if (replaceUrl) writeBookingUrl(result.state, { mode: "replace" });
        if (
          result.code === "slot_occupied" ||
          result.code === "dates_occupied"
        ) {
          setLinkIssue({
            message: result.reason,
            actionLabel:
              result.code === "dates_occupied"
                ? "Выбрать другие даты"
                : "Выбрать другое время",
          });
        } else {
          setLinkIssue(null);
          if (
            result.code !== "missing_room" &&
            result.code !== "room_not_found"
          ) {
            showToast(result.reason);
          }
        }
        return;
      }

      hydrate(result.state, result.slotMeta ?? null);
      rememberBookingUrlNavKey(result.state);
      if (replaceUrl) writeBookingUrl(result.state, { mode: "replace" });
      setLinkIssue(null);
    },
    [api, hydrate, showToast]
  );

  useEffect(() => {
    if (validatedRef.current) return;
    if (urlCandidate.stepId === "category") {
      validatedRef.current = true;
      setUrlReady(true);
      writeBookingUrl(urlCandidate, { mode: "replace" });
      return;
    }
    if (status !== "ready" || !config) return;

    let cancelled = false;
    validatedRef.current = true;

    void applyUrlCandidate(urlCandidate, { replaceUrl: true }).then(() => {
      if (!cancelled) setUrlReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [status, config, urlCandidate, applyUrlCandidate]);

  // Браузерные Назад / Вперёд
  useEffect(() => {
    const onPopState = () => {
      const candidate = parseBookingUrl();
      setHistoryBusy(true);
      void applyUrlCandidate(candidate, { replaceUrl: false })
        .catch(() => {
          hydrate(candidate);
          rememberBookingUrlNavKey(candidate);
        })
        .finally(() => setHistoryBusy(false));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [applyUrlCandidate, hydrate]);

  // verify/done без локальных данных (F5 / чужая ссылка) → checkout
  useEffect(() => {
    if (stepId === "verify" && !contactDraft) {
      goToStep("checkout");
    } else if (stepId === "done" && !bookingResult) {
      goToStep("checkout");
    }
  }, [stepId, contactDraft, bookingResult, goToStep]);

  const waitingUrl =
    (!urlReady && urlCandidate.stepId !== "category" && status !== "error") ||
    historyBusy;

  const checkoutPrice =
    basePrice != null && basePrice > 0
      ? basePrice
      : slotPrice != null && slotPrice > 0
        ? slotPrice
        : null;

  let body: React.ReactNode;
  if (isBlocking || waitingUrl) {
    body = <BookingLoader />;
  } else if (needsConfig && status === "error") {
    body = <BootstrapError error={error} onRetry={reload} />;
  } else if (linkIssue) {
    body = (
      <DeepLinkIssue
        message={linkIssue.message}
        actionLabel={linkIssue.actionLabel}
        onAction={() => setLinkIssue(null)}
      />
    );
  } else {
    body = (
      <>
        {stepId === "category" && <StepCategory onSelect={selectCategory} />}
        {stepId === "object" && categoryId && config && (
          <StepObject
            categoryId={categoryId}
            config={config}
            focusRoomId={objectFocus ? roomId : null}
            showAllLabel={
              objectFocus
                ? categoryId === "banya"
                  ? "Посмотреть все бани"
                  : "Посмотреть все дома"
                : null
            }
            onShowAll={objectFocus ? showAllObjects : undefined}
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
        {stepId === "checkout" &&
          categoryId &&
          config &&
          roomId &&
          checkoutPrice != null &&
          guestCount >= 1 && (
            <StepCheckout
              categoryId={categoryId}
              config={config}
              roomId={roomId}
              checkIn={checkIn}
              checkOut={checkOut}
              banyaDate={banyaDate}
              banyaTimeFrom={banyaTimeFrom}
              banyaTimeTo={banyaTimeTo}
              guestCount={guestCount}
              productQuantities={productQuantities}
              basePrice={checkoutPrice}
              calcMeta={calcMeta}
              initialContact={contactDraft}
              onContinue={continueFromCheckout}
            />
          )}
        {stepId === "verify" &&
          categoryId &&
          config &&
          roomId &&
          contactDraft &&
          checkoutPrice != null &&
          guestCount >= 1 && (
            <StepVerify
              categoryId={categoryId}
              config={config}
              roomId={roomId}
              checkIn={checkIn}
              checkOut={checkOut}
              banyaDate={banyaDate}
              banyaTimeFrom={banyaTimeFrom}
              banyaTimeTo={banyaTimeTo}
              slotDuration={slotDuration}
              guestCount={guestCount}
              productQuantities={productQuantities}
              basePrice={checkoutPrice}
              contact={contactDraft}
              onComplete={completeBooking}
              onBackToCheckout={() => goToStep("checkout")}
            />
          )}
        {stepId === "done" && bookingResult && (
          <StepDone result={bookingResult} onStartOver={startOver} />
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
        showHome={objectFocus}
        onHome={objectFocus ? startOver : undefined}
        hideStepLabel={objectFocus}
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
