import React, { useEffect, useMemo, useState } from "react";
import {
  createWidgetApi,
  type SaveBookingResponse,
  type WidgetGetResponse,
} from "../../../api";
import { BOOKING_ALIAS } from "../constants";
import type {
  BookingCalcMeta,
  BookingResultDraft,
  CheckoutContactDraft,
  PaymentMode,
  VerifyChannel,
} from "../checkout/checkoutDraft";
import {
  clearAuthToken,
  getAuthProfile,
  getValidAuthToken,
  readTokenFromResponse,
  saveAuthToken,
} from "../checkout/authToken";
import { ContactFields } from "../checkout/ContactFields";
import {
  formatRuPhoneMask,
  isRuPhoneComplete,
} from "../checkout/phone";
import { buildSaveBodies } from "../checkout/buildSavePayload";
import { ServiceOfferModal } from "../checkout/ServiceOfferModal";
import type { SetupCalcMeta } from "../setup/calculate.utils";
import { QuoteBreakdown } from "../setup/QuoteBreakdown";
import { resolveClientPrepay } from "../setup/resolveClientPrepay";
import { useBookingQuote } from "../setup/useBookingQuote";
import type { BookingCategoryId } from "../types";
import { getWidgetApiErrorDetail } from "../ui/errorMessages";
import { useBookingToast } from "../ui/ToastContext";

type Props = {
  categoryId: BookingCategoryId;
  config: WidgetGetResponse;
  roomId: string;
  checkIn: string | null;
  checkOut: string | null;
  banyaDate: string | null;
  banyaTimeFrom: string | null;
  banyaTimeTo: string | null;
  slotDuration?: number | null;
  slotPrice?: number | null;
  guestCount: number;
  productQuantities: Record<string, number>;
  basePrice: number | null;
  calcMeta?: BookingCalcMeta | null;
  initialContact?: CheckoutContactDraft | null;
  /** Меняется, когда проверка токена при заходе его удалила. */
  authVersion?: number;
  onBasePriceResolved: (price: number, meta?: SetupCalcMeta) => void;
  /** Номер не подтверждён (нет сохранённого токена) → шаг verify. */
  onContinue: (contact: CheckoutContactDraft) => void;
  /** Бронь создана сразу по сохранённому токену. */
  onBooked: (
    contact: CheckoutContactDraft,
    result: BookingResultDraft
  ) => void;
};

function isAuthRejected(err: unknown): boolean {
  const status =
    err && typeof err === "object" && "status" in err
      ? (err as { status: unknown }).status
      : null;
  return status === 401 || status === 403;
}

function readSaveMeta(
  res: SaveBookingResponse,
  totalFallback: number,
  confirmMessage: string,
  requestedMode: PaymentMode
): BookingResultDraft {
  const o = res as Record<string, unknown>;
  const price =
    typeof o.price === "number" && Number.isFinite(o.price) ? o.price : null;
  const timeout =
    typeof o.timeoutMinutes === "number" && Number.isFinite(o.timeoutMinutes)
      ? o.timeoutMinutes
      : null;
  const link =
    typeof res.paymentLink === "string" && res.paymentLink.trim()
      ? res.paymentLink.trim()
      : null;
  const modeRaw = o.paymentMode ?? res.paymentMode;
  const paymentMode: PaymentMode | null =
    modeRaw === "full" || modeRaw === "prepay" ? modeRaw : requestedMode;
  return {
    bookingId: String(res.bookingId ?? ""),
    price,
    prepayment: Number(res.amount) || 0,
    paymentLink: link,
    timeoutMinutes: timeout,
    message: confirmMessage,
    totalFallback,
    paymentMode,
  };
}

/**
 * Шаг 4: контакты и оплата.
 * Есть действующий токен для номера → бронь сразу, иначе → подтверждение номера.
 */
export const StepCheckout: React.FC<Props> = ({
  categoryId,
  config,
  roomId,
  checkIn,
  checkOut,
  banyaDate,
  banyaTimeFrom,
  banyaTimeTo,
  slotDuration = null,
  slotPrice = null,
  guestCount,
  productQuantities,
  basePrice,
  calcMeta = null,
  initialContact = null,
  authVersion = 0,
  onBasePriceResolved,
  onContinue,
  onBooked,
}) => {
  const { showToast } = useBookingToast();
  const api = useMemo(() => createWidgetApi({ alias: BOOKING_ALIAS }), []);
  // Авторизован → телефон и ФИО из /user/info (только память); черновик формы важнее
  const [authProfile] = useState(() =>
    initialContact ? null : getAuthProfile()
  );
  // /user/info ответил позже, чем открылся шаг → дозаполняем пустые поля
  useEffect(() => {
    if (initialContact) return;
    const profile = getAuthProfile();
    if (!profile) return;
    setLastName((v) => v || profile.lastName);
    setFirstName((v) => v || profile.firstName);
    setPhone((v) => v || formatRuPhoneMask(profile.phone));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- только при смене авторизации
  }, [authVersion]);
  const [firstName, setFirstName] = useState(
    initialContact?.firstName ?? authProfile?.firstName ?? ""
  );
  const [lastName, setLastName] = useState(
    initialContact?.lastName ?? authProfile?.lastName ?? ""
  );
  const [phone, setPhone] = useState(
    initialContact?.phone ??
      (authProfile ? formatRuPhoneMask(authProfile.phone) : "")
  );
  const [comment, setComment] = useState(initialContact?.comment ?? "");
  const [verifyChannel, setVerifyChannel] = useState<VerifyChannel>(
    initialContact?.verifyChannel ?? "telegram"
  );
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(
    initialContact?.paymentMode ?? "prepay"
  );
  const [termsAccepted, setTermsAccepted] = useState(Boolean(initialContact));
  const [offerOpen, setOfferOpen] = useState(false);
  const [isBusy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const quote = useBookingQuote({
    api,
    categoryId,
    config,
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
    calcMeta,
    onBasePriceResolved,
  });
  const {
    isLoading,
    error,
    hasCalculation,
    products,
    productsSubtotal,
    effectiveMeta,
    resolvedBase,
    total,
  } = quote;

  const telegramBotHref = useMemo(() => {
    const raw = config.company?.telegram?.trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw) || raw.startsWith("tg://")) return raw;
    const user = raw.replace(/^@/, "");
    return user ? `https://t.me/${user}` : null;
  }, [config.company?.telegram]);

  // Токен привязан к номеру: другой номер — подтверждаем заново
  const [tokenRevision, setTokenRevision] = useState(0);
  const savedToken = useMemo(
    () => (isRuPhoneComplete(phone) ? getValidAuthToken(phone) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tokenRevision: перечитать после сброса
    [phone, tokenRevision, authVersion]
  );

  const prepayHint = resolveClientPrepay(
    effectiveMeta?.prepay,
    productsSubtotal,
    effectiveMeta?.prepayIncludesProducts
  );

  const confirmMessage = (
    config.settings?.confirmMessage ?? "Спасибо! Ваша заявка принята."
  ).replace(/\\n/g, "\n");

  const formValid =
    firstName.trim().length >= 1 &&
    lastName.trim().length >= 1 &&
    isRuPhoneComplete(phone) &&
    termsAccepted &&
    hasCalculation &&
    resolvedBase > 0 &&
    !isLoading &&
    !error;

  const handleSubmit = async () => {
    if (!formValid || isBusy) return;
    setBusy(true);
    setSubmitError(null);

    const contact: CheckoutContactDraft = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone,
      comment,
      verifyChannel,
      paymentMode,
    };

    if (!savedToken) {
      setBusy(false);
      onContinue(contact);
      return;
    }

    api.setToken(savedToken);
    try {
      const built = buildSaveBodies(
        {
          categoryId,
          roomId,
          guestCount,
          productQuantities,
          total,
          checkIn,
          checkOut,
          banyaDate,
          banyaTimeFrom,
          banyaTimeTo,
          slotDuration,
        },
        contact,
        products,
        { paymentMode }
      );
      if (built.kind === "invalid") {
        throw new Error(built.reason);
      }

      const res =
        built.kind === "homes"
          ? await api.dailySave(built.body)
          : await api.saveRoomBooking(built.body);

      const issued = readTokenFromResponse(res);
      saveAuthToken({
        token: issued?.token ?? savedToken,
        expiresAt: issued?.expiresAt,
        phone,
        firstName: contact.firstName,
        lastName: contact.lastName,
      });

      onBooked(contact, readSaveMeta(res, total, confirmMessage, paymentMode));
    } catch (err) {
      if (isAuthRejected(err)) {
        // токен отозван/протух на сервере → подтверждаем номер заново
        clearAuthToken();
        api.setToken(null);
        setTokenRevision((n) => n + 1);
        onContinue(contact);
        return;
      }
      const detail = getWidgetApiErrorDetail(err);
      setSubmitError(detail);
      showToast(detail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="booking-checkout">
      <div className="booking-checkout__main">
        <QuoteBreakdown
          quote={quote}
          categoryId={categoryId}
          guestCount={guestCount}
          banyaDate={banyaDate}
          banyaTimeFrom={banyaTimeFrom}
          banyaTimeTo={banyaTimeTo}
          checkIn={checkIn}
          checkOut={checkOut}
        />

        <ContactFields
          firstName={firstName}
          lastName={lastName}
          phoneDisplay={phone}
          comment={comment}
          onFirstNameChange={setFirstName}
          onLastNameChange={setLastName}
          onPhoneChange={(raw) => setPhone(formatRuPhoneMask(raw))}
          onCommentChange={setComment}
        />

        {savedToken ? (
          <p className="booking-checkout__channel-note">
            Номер уже подтверждён — повторное подтверждение не нужно
          </p>
        ) : (
          <fieldset className="booking-checkout__messenger">
            <legend className="booking-checkout__label">
              Как подтвердить номер
            </legend>
            <div className="booking-checkout__radio-group">
              <label className="booking-checkout__radio">
                <input
                  type="radio"
                  name="bk-verify"
                  checked={verifyChannel === "telegram"}
                  onChange={() => setVerifyChannel("telegram")}
                />
                <span>Telegram</span>
              </label>
              <label className="booking-checkout__radio">
                <input
                  type="radio"
                  name="bk-verify"
                  checked={verifyChannel === "max"}
                  onChange={() => setVerifyChannel("max")}
                />
                <span>MAX</span>
              </label>
              <label className="booking-checkout__radio">
                <input
                  type="radio"
                  name="bk-verify"
                  checked={verifyChannel === "call"}
                  onChange={() => setVerifyChannel("call")}
                />
                <span>По телефону</span>
              </label>
            </div>
            {verifyChannel === "telegram" ? (
              <p className="booking-checkout__channel-note">
                Внимание! Важно, чтобы бот
                {telegramBotHref ? (
                  <>
                    {" "}
                    (
                    <a
                      className="booking-checkout__channel-note-link"
                      href={telegramBotHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      ссылка на бота
                    </a>
                    )
                  </>
                ) : null}{" "}
                был не заблокирован
              </p>
            ) : null}
          </fieldset>
        )}

        <fieldset className="booking-checkout__messenger">
          <legend className="booking-checkout__label">Оплата</legend>
          <div className="booking-checkout__radio-group">
            <label className="booking-checkout__radio">
              <input
                type="radio"
                name="bk-payment-mode"
                checked={paymentMode === "prepay"}
                onChange={() => setPaymentMode("prepay")}
                disabled={isBusy}
              />
              <span>
                Частичная
                {prepayHint != null
                  ? ` — ${prepayHint.toLocaleString("ru-RU")} ₽`
                  : " (предоплата)"}
              </span>
            </label>
            <label className="booking-checkout__radio">
              <input
                type="radio"
                name="bk-payment-mode"
                checked={paymentMode === "full"}
                onChange={() => setPaymentMode("full")}
                disabled={isBusy}
              />
              <span>Полная — {total.toLocaleString("ru-RU")} ₽</span>
            </label>
          </div>
        </fieldset>

        <div className="booking-checkout__consents">
          <label className="booking-checkout__privacy">
            <input
              type="checkbox"
              required
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <span>
              Я соглашаюсь с условиями{" "}
              <button
                type="button"
                className="booking-checkout__terms-link"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOfferOpen(true);
                }}
              >
                бронирования услуг
              </button>
            </span>
          </label>
        </div>

        {submitError ? (
          <p className="booking-checkout__hint" role="alert">
            {submitError}
          </p>
        ) : null}
      </div>

      <div className="booking-checkout__footer">
        <button
          type="button"
          className="booking-checkout__submit"
          disabled={!formValid || isBusy}
          onClick={() => void handleSubmit()}
        >
          {isBusy
            ? "Создаём бронь…"
            : savedToken
              ? "Забронировать"
              : "Далее →"}
        </button>
      </div>

      <ServiceOfferModal open={offerOpen} onClose={() => setOfferOpen(false)} />
    </div>
  );
};
