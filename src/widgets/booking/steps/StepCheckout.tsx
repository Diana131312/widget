import React, { useMemo, useState } from "react";
import { createWidgetApi, type SaveBookingResponse } from "../../../api";
import { BOOKING_ALIAS } from "../constants";
import {
  buildCheckoutProducts,
  buildSaveBodies,
} from "../checkout/buildSavePayload";
import { CheckoutSummary } from "../checkout/CheckoutSummary";
import { ContactFields } from "../checkout/ContactFields";
import {
  formatRuPhoneMask,
  isRuPhoneComplete,
  toApiPhone,
} from "../checkout/phone";
import type { BookingCategoryId } from "../types";
import { getAuthErrorCopy, getBootstrapErrorCopy } from "../ui/errorMessages";
import { useBookingToast } from "../ui/ToastContext";

type Props = {
  categoryId: BookingCategoryId;
  config: import("../../../api").WidgetGetResponse;
  roomId: string;
  checkIn: string | null;
  checkOut: string | null;
  banyaDate: string | null;
  banyaTimeFrom: string | null;
  banyaTimeTo: string | null;
  slotDuration: number | null;
  guestCount: number;
  productQuantities: Record<string, number>;
  basePrice: number;
  onStartOver: () => void;
};

type SaveSuccess = {
  bookingId: string;
  price: number | null;
  prepayment: number;
  paymentLink: string | null;
  timeoutMinutes: number | null;
  message: string;
};

function readSaveMeta(res: SaveBookingResponse): SaveSuccess {
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
  return {
    bookingId: String(res.bookingId ?? ""),
    price,
    prepayment: Number(res.amount) || 0,
    paymentLink: link,
    timeoutMinutes: timeout,
    message: "",
  };
}

export const StepCheckout: React.FC<Props> = ({
  categoryId,
  config,
  roomId,
  checkIn,
  checkOut,
  banyaDate,
  banyaTimeFrom,
  banyaTimeTo,
  slotDuration,
  guestCount,
  productQuantities,
  basePrice,
  onStartOver,
}) => {
  const { showToast } = useBookingToast();
  const api = useMemo(() => createWidgetApi({ alias: BOOKING_ALIAS }), []);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [messenger, setMessenger] = useState<"telegram" | "max">("telegram");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [phase, setPhase] = useState<"form" | "otp" | "success">("form");
  const [otpCode, setOtpCode] = useState("");
  const [botLink, setBotLink] = useState<string | null>(null);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SaveSuccess | null>(null);

  const roomName = useMemo(() => {
    if (categoryId === "homes") {
      return config.dailyRooms?.find((r) => r.id === roomId)?.name ?? "Дом";
    }
    return config.rooms?.find((r) => r.id === roomId)?.name ?? "Баня";
  }, [categoryId, config, roomId]);

  const products = useMemo(
    () => buildCheckoutProducts(config, productQuantities),
    [config, productQuantities]
  );
  const productLines = products.map((p) => ({
    id: p.id,
    name: p.name,
    qty: p.count,
    lineTotal: p.price * p.count,
  }));
  const productsSubtotal = productLines.reduce((s, l) => s + l.lineTotal, 0);
  const total = basePrice + productsSubtotal;

  const formValid =
    fullName.trim().length >= 2 &&
    isRuPhoneComplete(phone) &&
    privacyAccepted;

  const confirmMessage =
    (config.settings?.confirmMessage ?? "Спасибо! Ваша заявка принята.").replace(
      /\\n/g,
      "\n"
    );

  const sendCode = async () => {
    setError(null);
    setBotLink(null);
    setBusy(true);
    try {
      const response = await api.sendSms({
        number: toApiPhone(phone),
        messenger,
      });
      if (!response.success && "needBotVerification" in response) {
        setBotLink(response.botLink);
        setError("Подтвердите мессенджер, затем запросите код ещё раз");
        return;
      }
      setPhase("otp");
      setOtpCode("");
      showToast("Код отправлен");
    } catch (err) {
      const { detail } = getBootstrapErrorCopy(err);
      setError(detail);
    } finally {
      setBusy(false);
    }
  };

  const createBooking = async (checkCode: string) => {
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
      { fullName, phone, comment, messenger },
      products,
      checkCode
    );
    if (built.kind === "invalid") {
      throw new Error(built.reason);
    }

    // /save для бани требует JWT — получаем через /auth
    try {
      await api.auth({
        phone: toApiPhone(phone),
        code: checkCode,
      });
    } catch (err) {
      const authErr = new Error(getAuthErrorCopy(err).detail);
      (authErr as Error & { cause?: unknown }).cause = err;
      throw authErr;
    }

    if (built.kind === "homes") {
      return api.dailySave(built.body);
    }
    return api.saveRoomBooking(built.body);
  };

  const handleSubmitForm = () => {
    if (!formValid || isBusy) return;
    void sendCode();
  };

  const handleConfirmOtp = async () => {
    if (otpCode.trim().length < 4 || isBusy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await createBooking(otpCode.trim());
      const meta = readSaveMeta(res);
      meta.message = confirmMessage;
      setSuccess(meta);
      setPhase("success");
      if (meta.paymentLink) {
        window.location.assign(meta.paymentLink);
      }
    } catch (err) {
      // auth уже завёрнут в понятный Error; save — через bootstrap-копии
      if (err instanceof Error && err.cause) {
        setError(err.message);
      } else {
        const { detail } = getBootstrapErrorCopy(err);
        setError(
          err instanceof Error && err.message && !err.message.startsWith("Widget API")
            ? err.message
            : detail
        );
      }
    } finally {
      setBusy(false);
    }
  };

  if (phase === "success" && success) {
    return (
      <div className="booking-checkout booking-checkout--success">
        <p className="booking-checkout__success-title">Бронь создана</p>
        <p className="booking-checkout__success-text booking-checkout__success-text--pre">
          {success.message}
        </p>
        <ul className="booking-checkout__success-meta">
          {success.price != null && success.price > 0 ? (
            <li>
              Стоимость{" "}
              <strong>{success.price.toLocaleString("ru-RU")} ₽</strong>
            </li>
          ) : (
            <li>
              Стоимость{" "}
              <strong>{total.toLocaleString("ru-RU")} ₽</strong>
            </li>
          )}
          <li>
            Предоплата{" "}
            <strong>{success.prepayment.toLocaleString("ru-RU")} ₽</strong>
          </li>
          {success.timeoutMinutes != null ? (
            <li>
              Оплатите в течение{" "}
              <strong>{success.timeoutMinutes} мин.</strong>
            </li>
          ) : null}
        </ul>
        <div className="booking-checkout__success-actions">
          {success.paymentLink ? (
            <a
              className="booking-checkout__submit"
              href={success.paymentLink}
            >
              Перейти к оплате
            </a>
          ) : null}
          <button
            type="button"
            className="booking-checkout__secondary"
            onClick={onStartOver}
          >
            К началу
          </button>
        </div>
      </div>
    );
  }

  if (phase === "otp") {
    return (
      <div className="booking-checkout">
        <div className="booking-checkout__main">
          <p className="booking-checkout__otp-title">Подтверждение телефона</p>
          <p className="booking-checkout__otp-hint">
            Введите 4-значный код, отправленный на {formatRuPhoneMask(phone)}
          </p>
          <label className="booking-checkout__label" htmlFor="bk-otp">
            Код из сообщения
          </label>
          <input
            id="bk-otp"
            className="booking-checkout__input booking-checkout__input--otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otpCode}
            onChange={(e) =>
              setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            disabled={isBusy}
          />
          {error ? (
            <p className="booking-checkout__hint" role="alert">
              {error}
            </p>
          ) : null}
          {botLink ? (
            <a
              className="booking-checkout__bot-link"
              href={botLink}
              target="_blank"
              rel="noreferrer"
            >
              Открыть бота для подтверждения
            </a>
          ) : null}
        </div>
        <div className="booking-checkout__footer">
          <button
            type="button"
            className="booking-checkout__submit"
            disabled={otpCode.trim().length < 4 || isBusy}
            onClick={() => void handleConfirmOtp()}
          >
            {isBusy ? "Создаём бронь…" : "Подтвердить и забронировать"}
          </button>
          <button
            type="button"
            className="booking-checkout__secondary"
            disabled={isBusy}
            onClick={() => {
              setPhase("form");
              setOtpCode("");
              setError(null);
            }}
          >
            Назад
          </button>
          <button
            type="button"
            className="booking-checkout__linkish"
            disabled={isBusy}
            onClick={() => void sendCode()}
          >
            Отправить код ещё раз
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-checkout">
      <div className="booking-checkout__main">
        <CheckoutSummary
          categoryId={categoryId}
          roomName={roomName}
          guestCount={guestCount}
          basePrice={basePrice}
          productLines={productLines}
          total={total}
          banyaDate={banyaDate}
          banyaTimeFrom={banyaTimeFrom}
          banyaTimeTo={banyaTimeTo}
          checkIn={checkIn}
          checkOut={checkOut}
        />

        <ContactFields
          fullName={fullName}
          phoneDisplay={phone}
          comment={comment}
          onFullNameChange={setFullName}
          onPhoneChange={(raw) => setPhone(formatRuPhoneMask(raw))}
          onCommentChange={setComment}
        />

        <fieldset className="booking-checkout__messenger">
          <legend className="booking-checkout__label">
            Куда отправить код подтверждения
          </legend>
          <div className="booking-checkout__radio-group">
            <label className="booking-checkout__radio">
              <input
                type="radio"
                name="bk-messenger"
                checked={messenger === "telegram"}
                onChange={() => setMessenger("telegram")}
              />
              <span>Telegram</span>
            </label>
            <label className="booking-checkout__radio">
              <input
                type="radio"
                name="bk-messenger"
                checked={messenger === "max"}
                onChange={() => setMessenger("max")}
              />
              <span>MAX</span>
            </label>
          </div>
        </fieldset>

        <label className="booking-checkout__privacy">
          <input
            type="checkbox"
            checked={privacyAccepted}
            onChange={(e) => setPrivacyAccepted(e.target.checked)}
          />
          <span>Принимаю условия конфиденциальности</span>
        </label>

        {error ? (
          <p className="booking-checkout__hint" role="alert">
            {error}
          </p>
        ) : null}
        {botLink ? (
          <a
            className="booking-checkout__bot-link"
            href={botLink}
            target="_blank"
            rel="noreferrer"
          >
            Открыть бота для подтверждения
          </a>
        ) : null}
      </div>

      <div className="booking-checkout__footer">
        <p className="booking-checkout__total">
          Стоимость{" "}
          <span className="booking-checkout__total-num">
            {total.toLocaleString("ru-RU")} ₽
          </span>
        </p>
        <p className="booking-checkout__prepay-note">
          Сумма предоплаты появится после создания брони
        </p>
        <button
          type="button"
          className="booking-checkout__submit"
          disabled={!formValid || isBusy}
          onClick={handleSubmitForm}
        >
          {isBusy ? "Отправляем код…" : "Забронировать"}
        </button>
      </div>
    </div>
  );
};
