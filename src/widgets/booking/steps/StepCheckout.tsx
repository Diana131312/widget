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
  PayChoice,
  PaymentMode,
  VerifyChannel,
} from "../checkout/checkoutDraft";
import { withInvoiceIntent } from "../checkout/checkoutDraft";
import { invoicePaymentEnabled, isInvoiceEmail } from "../checkout/invoiceApi";
import {
  clearAuthToken,
  getAuthProfile,
  getValidAuthToken,
  readTokenFromResponse,
  saveAuthToken,
} from "../checkout/authToken";
import { ContactFields } from "../checkout/ContactFields";
import { PromoCodeField, type CodeMark } from "../ui/PromoCodeField";
import {
  bookingPromoMessage,
  certificateApplyHint,
  certificatePaymentPreview,
  checkBookingCertificate,
  checkBookingPromo,
  openBookingPayment,
  settleBookingPayment,
  type CheckedCertificate,
} from "../checkout/bookingPay";
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
    initialContact?.verifyChannel ?? "max"
  );
  const invoiceEnabled = invoicePaymentEnabled(config);
  const [payChoice, setPayChoice] = useState<PayChoice>(
    initialContact?.payByInvoice && invoicePaymentEnabled(config)
      ? "invoice"
      : initialContact?.paymentMode ?? "prepay"
  );
  const [invoiceEmail, setInvoiceEmail] = useState(initialContact?.invoiceEmail ?? "");
  const paymentMode: PaymentMode = payChoice === "invoice" ? "full" : payChoice;
  const [termsAccepted, setTermsAccepted] = useState(Boolean(initialContact));
  const [offerOpen, setOfferOpen] = useState(false);
  const [isBusy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState(initialContact?.promoCode ?? "");
  const [promoMark, setPromoMark] = useState<CodeMark>(
    initialContact?.promoCode ? "ok" : "idle"
  );
  const [promoPercent, setPromoPercent] = useState<number | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [codesBusy, setCodesBusy] = useState(false);
  const [certificateNumber, setCertificateNumber] = useState(
    initialContact?.certificateNumber ?? ""
  );
  const [certificateMark, setCertificateMark] = useState<CodeMark>(
    initialContact?.certificateNumber ? "ok" : "idle"
  );
  const [checkedCertificate, setCheckedCertificate] =
    useState<CheckedCertificate | null>(null);
  const [certificateError, setCertificateError] = useState<string | null>(null);
  const [certificateBusy, setCertificateBusy] = useState(false);

  const acceptedPromo = promoMark === "ok" ? promoCode.trim() : "";
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
    promoCode: acceptedPromo || null,
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
  const certificateReady =
    payChoice !== "invoice" &&
    certificateMark === "ok" &&
    certificateNumber.trim().length > 0 &&
    checkedCertificate?.balance !== 0;
  const certificateBalance =
    certificateReady && checkedCertificate && checkedCertificate.balance > 0
      ? checkedCertificate.balance
      : null;
  const partialDue =
    certificateBalance != null
      ? certificatePaymentPreview(total, prepayHint, certificateBalance, "prepay").due
      : prepayHint;
  const fullDue =
    certificateBalance != null
      ? certificatePaymentPreview(total, prepayHint, certificateBalance, "full").due
      : total;
  const certificateBill =
    paymentMode === "prepay" && prepayHint != null ? prepayHint : total;
  const certificateHint =
    checkedCertificate && certificateBalance != null
      ? certificateApplyHint(
          checkedCertificate.name,
          checkedCertificate.balance,
          certificateBill
        )
      : null;
  const certificatePending =
    payChoice !== "invoice" &&
    certificateNumber.trim().length > 0 &&
    certificateMark !== "ok";

  const confirmMessage = (
    config.settings?.confirmMessage ?? "Спасибо! Ваша заявка принята."
  ).replace(/\\n/g, "\n");

  const formValid =
    firstName.trim().length >= 1 &&
    lastName.trim().length >= 1 &&
    isRuPhoneComplete(phone) &&
    termsAccepted &&
    (payChoice !== "invoice" || isInvoiceEmail(invoiceEmail)) &&
    !certificatePending &&
    hasCalculation &&
    resolvedBase > 0 &&
    !isLoading &&
    !error;

  const handleCheckPromo = async () => {
    const code = promoCode.trim();
    const date = categoryId === "homes" ? checkIn : banyaDate;
    if (!code || codesBusy || isBusy) return;
    if (!date) {
      setPromoMark("bad");
      setPromoPercent(null);
      setPromoError("Сначала выберите дату");
      return;
    }
    setCodesBusy(true);
    setPromoError(null);
    try {
      const result = await checkBookingPromo({
        promoCode: code,
        roomId,
        date,
      });
      if (result.discount > 0 && result.reason === "ok") {
        setPromoMark("ok");
        setPromoPercent(result.discount);
        return;
      }
      setPromoMark("bad");
      setPromoPercent(null);
      setPromoError(bookingPromoMessage(result));
    } catch (err) {
      setPromoMark("bad");
      setPromoPercent(null);
      setPromoError(getWidgetApiErrorDetail(err));
    } finally {
      setCodesBusy(false);
    }
  };

  const handleCheckCertificate = async () => {
    const number = certificateNumber.trim();
    if (!number || certificateBusy || isBusy || payChoice === "invoice") return;
    setCertificateBusy(true);
    setCertificateError(null);
    try {
      const checked = await checkBookingCertificate(number);
      setCheckedCertificate(checked);
      setCertificateMark("ok");
    } catch (err) {
      setCheckedCertificate(null);
      setCertificateMark("bad");
      setCertificateError(getWidgetApiErrorDetail(err));
    } finally {
      setCertificateBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (isBusy) return;
    if (!formValid) {
      setAttempted(true);
      return;
    }
    setBusy(true);
    setSubmitError(null);

    const contact: CheckoutContactDraft = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone,
      comment,
      verifyChannel,
      paymentMode,
      ...(payChoice === "invoice"
        ? { payByInvoice: true, invoiceEmail: invoiceEmail.trim() }
        : {}),
      ...(promoMark === "ok" && promoCode.trim()
        ? { promoCode: promoCode.trim() }
        : {}),
      ...(certificateReady
        ? { certificateNumber: certificateNumber.trim() }
        : {}),
    };

    if (!savedToken) {
      setBusy(false);
      onContinue(contact);
      return;
    }

    api.setToken(savedToken);
    let leavingForPayment = false;
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

      const meta = withInvoiceIntent(
        readSaveMeta(res, total, confirmMessage, paymentMode),
        contact,
        categoryId
      );
      try {
        const next = await settleBookingPayment(meta, contact.certificateNumber);
        if (next.action === "redirect") {
          openBookingPayment(next.link);
          leavingForPayment = true;
          return;
        }
        onBooked(contact, next.result);
      } catch {
        onBooked(contact, meta);
      }
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
      if (!leavingForPayment) setBusy(false);
    }
  };

  return (
    <div className="booking-checkout">
      <div className="booking-checkout__main">
        <ContactFields
          firstName={firstName}
          lastName={lastName}
          phoneDisplay={phone}
          comment={comment}
          onFirstNameChange={setFirstName}
          onLastNameChange={setLastName}
          onPhoneChange={(raw) => setPhone(formatRuPhoneMask(raw))}
          onCommentChange={setComment}
          showErrors={attempted}
        />

        {savedToken ? null : (
          <fieldset className="booking-checkout__messenger">
            <legend className="booking-checkout__label">
              подтвердите номер телефона
            </legend>
            <div className="booking-checkout__radio-group">
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
                  checked={verifyChannel === "telegram"}
                  onChange={() => setVerifyChannel("telegram")}
                />
                <span>Telegram</span>
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

        <hr className="booking-checkout__rule" />

        <fieldset className="booking-checkout__messenger">
          <legend className="booking-checkout__label">Оплата</legend>
          <div className="booking-checkout__radio-group">
            <label className="booking-checkout__radio">
              <input
                type="radio"
                name="bk-payment-mode"
                checked={payChoice === "prepay"}
                onChange={() => setPayChoice("prepay")}
                disabled={isBusy}
              />
              <span>
                Частичная
                {partialDue != null
                  ? ` — ${partialDue.toLocaleString("ru-RU")} ₽`
                  : " (предоплата)"}
              </span>
            </label>
            <label className="booking-checkout__radio">
              <input
                type="radio"
                name="bk-payment-mode"
                checked={payChoice === "full"}
                onChange={() => setPayChoice("full")}
                disabled={isBusy}
              />
              <span>Полная — {fullDue.toLocaleString("ru-RU")} ₽</span>
            </label>
            {invoiceEnabled ? (
              <label className="booking-checkout__radio">
                <input
                  type="radio"
                  name="bk-payment-mode"
                  checked={payChoice === "invoice"}
                  onChange={() => setPayChoice("invoice")}
                  disabled={isBusy}
                />
                <span>Оплата с р/счета юр. лица</span>
              </label>
            ) : null}
          </div>
          {payChoice === "invoice" ? (
            <div className="booking-checkout__field booking-invoice__email">
              <label className="booking-checkout__label" htmlFor="bk-invoice-email">
                Почта для отправки счёта
              </label>
              <input
                id="bk-invoice-email"
                className={
                  attempted && !isInvoiceEmail(invoiceEmail)
                    ? "booking-checkout__input booking-checkout__input--invalid"
                    : "booking-checkout__input"
                }
                aria-invalid={attempted && !isInvoiceEmail(invoiceEmail)}
                name="invoice-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                aria-required="true"
                value={invoiceEmail}
                disabled={isBusy}
                onChange={(event) => setInvoiceEmail(event.target.value)}
              />
            </div>
          ) : null}
        </fieldset>

        <PromoCodeField
          id="bk-promo"
          name="booking-promo"
          value={promoCode}
          mark={promoMark}
          percent={promoPercent}
          error={promoError}
          checking={codesBusy}
          checkDisabled={isBusy}
          onChange={(value) => {
            setPromoCode(value);
            setPromoMark("idle");
            setPromoPercent(null);
            setPromoError(null);
          }}
          onCheck={() => void handleCheckPromo()}
        />

        {payChoice !== "invoice" ? (
          <div className="booking-checkout__field">
            <label className="booking-checkout__label" htmlFor="bk-certificate">
              Сертификат
            </label>
            <div className="booking-certificate__promo-row">
              <input
                id="bk-certificate"
                className={
                  attempted && certificatePending
                    ? "booking-checkout__input booking-checkout__input--invalid"
                    : "booking-checkout__input"
                }
                aria-invalid={attempted && certificatePending}
                name="booking-certificate"
                inputMode="numeric"
                autoComplete="off"
                value={certificateNumber}
                disabled={isBusy || certificateBusy}
                onChange={(event) => {
                  setCertificateNumber(event.target.value);
                  setCertificateMark("idle");
                  setCheckedCertificate(null);
                  setCertificateError(null);
                }}
              />
              {certificateMark === "ok" && checkedCertificate ? (
                <span
                  className="booking-certificate__promo-mark booking-certificate__promo-mark--ok"
                  role="img"
                  aria-label={certificateHint ?? checkedCertificate.name}
                >
                  ✓
                </span>
              ) : certificateMark === "bad" ? (
                <span
                  className="booking-certificate__promo-mark booking-certificate__promo-mark--bad"
                  role="img"
                  aria-label="Сертификат не подошёл"
                >
                  ✕
                </span>
              ) : (
                <button
                  type="button"
                  className={[
                    "booking-certificate__promo-check",
                    certificateNumber.trim() &&
                      "booking-certificate__promo-check--ready",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={!certificateNumber.trim() || certificateBusy || isBusy}
                  onClick={() => void handleCheckCertificate()}
                >
                  {certificateBusy ? "…" : "проверить"}
                </button>
              )}
            </div>
            {certificateHint ? (
              <p className="booking-checkout__hint">{certificateHint}</p>
            ) : null}
            {certificateError ? (
              <p className="booking-certificate__promo-error" role="alert">
                {certificateError}
              </p>
            ) : null}
          </div>
        ) : null}

        <QuoteBreakdown
          quote={quote}
          categoryId={categoryId}
          guestCount={guestCount}
          banyaDate={banyaDate}
          banyaTimeFrom={banyaTimeFrom}
          banyaTimeTo={banyaTimeTo}
          checkIn={checkIn}
          checkOut={checkOut}
          paymentMode={paymentMode}
          certificateBalance={certificateBalance}
          promoPercent={promoMark === "ok" ? promoPercent : null}
        />

        <div className="booking-checkout__consents">
          <label
            className={
              attempted && !termsAccepted
                ? "booking-checkout__privacy booking-checkout__privacy--invalid"
                : "booking-checkout__privacy"
            }
          >
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
          disabled={isBusy}
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
