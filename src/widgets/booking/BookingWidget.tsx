import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./booking.css";
import { createWidgetApi } from "../../api";
import { getAuthProfile } from "./checkout/authToken";
import {
  clearPendingBooking,
  isSameSlot,
  readPendingBooking,
  savePendingBooking,
} from "./checkout/pendingBooking";
import { refreshStoredAuth } from "./checkout/refreshAuth";
import { useBookingBootstrap } from "./bootstrap/useBookingBootstrap";
import { BOOKING_ALIAS, BOOKING_UNIFIED_ROBOTO_FONT } from "./constants";
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

  // При заходе проверяем сохранённый токен (GET /user/info); протухший удаляем
  const [authVersion, setAuthVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    void refreshStoredAuth(api).then((r) => {
      if (alive && (r === "cleared" || r === "valid")) {
        setAuthVersion((v) => v + 1);
      }
    });
    return () => {
      alive = false;
    };
  }, [api]);

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
    completeFromCheckout,
    restorePending,
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
      // done заменяет verify/checkout в истории → браузерный «назад» сразу на оформление
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

      // Слот держит наша неоплаченная бронь → экран оплаты, а не «слот занят»
      const pending = readPendingBooking();
      if (
        pending &&
        candidate.stepId !== "category" &&
        candidate.stepId !== "object" &&
        isSameSlot(candidate, pending.state)
      ) {
        restorePending(pending);
        const doneState = { ...pending.state, stepId: "done" as const };
        rememberBookingUrlNavKey(doneState);
        writeBookingUrl(doneState, { mode: "replace" });
        setLinkIssue(null);
        return;
      }

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
    [api, hydrate, restorePending, showToast]
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

  // Неоплаченную бронь запоминаем во вкладке — переживёт F5
  useEffect(() => {
    if (stepId !== "done" || !bookingResult || !contactDraft || !categoryId) {
      return;
    }
    savePendingBooking({
      state: {
        stepId: "done",
        categoryId,
        roomId,
        checkIn,
        checkOut,
        banyaDate,
        banyaTimeFrom,
        banyaTimeTo,
        guestCount,
        productQuantities,
      },
      contact: contactDraft,
      result: bookingResult,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- снимок на момент брони
  }, [stepId, bookingResult, contactDraft]);

  const leaveDone = useCallback(() => {
    clearPendingBooking();
    goToStep("checkout");
  }, [goToStep]);

  const startOverClean = useCallback(() => {
    clearPendingBooking();
    setLinkIssue(null);
    startOver();
  }, [startOver]);

  // Авторизован → «Фамилия Имя» из /user/info в шапке (позже — личный кабинет)
  const authProfile = useMemo(
    () => getAuthProfile(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- перечитать после входа/сброса
    [authVersion, stepId, bookingResult]
  );
  const userLabel =
    [authProfile?.lastName, authProfile?.firstName]
      .filter(Boolean)
      .join(" ") || null;

  // verify/done без локальных данных (F5 / чужая ссылка) → checkout
  useEffect(() => {
    if (stepId === "verify" && !contactDraft) {
      goToStep("checkout");
    } else if (stepId === "done" && !bookingResult) {
      goToStep("checkout");
    }
  }, [stepId, contactDraft, bookingResult, goToStep]);

  const verifyBasePrice =
    basePrice != null && basePrice > 0
      ? basePrice
      : slotPrice != null && slotPrice > 0
        ? slotPrice
        : null;

  const waitingUrl =
    (!urlReady && urlCandidate.stepId !== "category" && status !== "error") ||
    historyBusy;

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
            basePrice={basePrice}
            calcMeta={calcMeta}
            guestCount={guestCount}
            productQuantities={productQuantities}
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
              slotDuration={slotDuration}
              slotPrice={slotPrice}
              guestCount={guestCount}
              productQuantities={productQuantities}
              basePrice={basePrice}
              calcMeta={calcMeta}
              initialContact={contactDraft}
              onBasePriceResolved={setBasePriceResolved}
              authVersion={authVersion}
              onContinue={continueFromCheckout}
              onBooked={completeFromCheckout}
            />
          )}
        {stepId === "verify" &&
          categoryId &&
          config &&
          roomId &&
          contactDraft &&
          verifyBasePrice != null &&
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
              basePrice={verifyBasePrice}
              calcMeta={calcMeta}
              contact={contactDraft}
              onComplete={completeBooking}
              onBackToCheckout={() => goToStep("checkout")}
            />
          )}
        {stepId === "done" && bookingResult && (
          <StepDone
            result={bookingResult}
            contactPhone={contactDraft?.phone ?? null}
            onStartOver={startOverClean}
            onBackToCart={leaveDone}
          />
        )}
      </>
    );
  }

  return (
    <div
      className={
        BOOKING_UNIFIED_ROBOTO_FONT ? "bk-widget bk-widget--font-roboto" : "bk-widget"
      }
    >
      <BookingLayout
        stepId={stepId}
        title={title}
        canGoBack={canGoBack}
        onBack={() => {
          setLinkIssue(null);
          back();
        }}
        showHome={objectFocus}
        onHome={objectFocus ? startOverClean : undefined}
        hideStepLabel={objectFocus}
        userLabel={userLabel}
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
