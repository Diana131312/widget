import React, { useEffect, useMemo, useState } from "react";
import { createWidgetApi } from "../../../api";
import { getValidAuthToken } from "../checkout/authToken";
import type { BookingResultDraft } from "../checkout/checkoutDraft";
import { BOOKING_ALIAS } from "../constants";
import { getApiBodyMessage } from "../ui/errorMessages";

type Props = {
  result: BookingResultDraft;
  /** Телефон брони — по нему берём токен для отмены. */
  contactPhone: string | null;
  onStartOver: () => void;
  /** Бронь отменена (или истекла) → обратно в корзину. */
  onBackToCart: () => void;
};

function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

/** Секунды до автоотмены. null — таймаута нет. */
function useSecondsLeft(
  minutes: number | null,
  expiresAtMs: number | null | undefined
): number | null {
  // expiresAtMs сохраняется с бронью → после F5 таймер продолжается
  const [deadline] = useState(() =>
    expiresAtMs != null
      ? expiresAtMs
      : minutes != null && minutes > 0
        ? Date.now() + minutes * 60 * 1000
        : null
  );
  const calc = () =>
    deadline == null ? null : Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  const [left, setLeft] = useState(calc);

  useEffect(() => {
    if (deadline == null) return;
    const id = window.setInterval(() => setLeft(calc()), 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deadline фиксирован
  }, [deadline]);

  return left;
}

/**
 * Шаг 6: временная бронь. Не оплатил за timeoutMinutes → сервер отменит.
 * Вернуться в корзину можно только через отмену брони (иначе слот занят).
 */
export const StepDone: React.FC<Props> = ({
  result,
  contactPhone,
  onStartOver,
  onBackToCart,
}) => {
  const api = useMemo(() => createWidgetApi({ alias: BOOKING_ALIAS }), []);
  const secondsLeft = useSecondsLeft(
    result.timeoutMinutes,
    result.expiresAtMs
  );
  const expired = secondsLeft === 0;
  const isTemporary = Boolean(result.paymentLink) && secondsLeft != null;
  const token = contactPhone ? getValidAuthToken(contactPhone) : null;
  const canCancel = Boolean(token && result.bookingId);

  const [isCancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const openPayment = () => {
    if (!result.paymentLink) return;
    window.open(result.paymentLink, "_blank", "noopener,noreferrer");
  };

  const cancelAndBack = async () => {
    if (!token || isCancelling) return;
    setCancelling(true);
    setCancelError(null);
    api.setToken(token);
    try {
      const res = await api.cancelBooking(result.bookingId, { confirmed: true });
      if (res && res.success === false) {
        throw new Error("Не удалось отменить бронь");
      }
      onBackToCart();
    } catch (err) {
      // Внятный текст с бэка показываем; техническое исключение — нет
      setCancelError(
        getApiBodyMessage(err) ??
          "Не удалось отменить бронь. Если её не оплатить, она отменится автоматически, когда истечёт время."
      );
      setCancelling(false);
    }
  };

  const rules = result.message ? (
    <>
      <hr className="booking-checkout__success-divider" />
      <p className="booking-checkout__success-subtitle">Правила для гостей</p>
      <p className="booking-checkout__success-text booking-checkout__success-text--pre">
        {result.message}
      </p>
    </>
  ) : null;

  if (!isTemporary) {
    return (
      <div className="booking-checkout booking-checkout--success">
        <p className="booking-checkout__success-title">Бронь создана</p>
        <div className="booking-checkout__success-actions">
          <button
            type="button"
            className="booking-checkout__secondary"
            onClick={onStartOver}
          >
            К началу
          </button>
        </div>
        {rules}
      </div>
    );
  }

  if (expired) {
    return (
      <div className="booking-checkout booking-checkout--success">
        <p className="booking-checkout__success-title">Время на оплату истекло</p>
        <p className="booking-checkout__success-text">
          Бронь отменена. Вы можете оформить её заново.
        </p>
        <div className="booking-checkout__success-actions">
          <button
            type="button"
            className="booking-checkout__submit"
            onClick={onBackToCart}
          >
            Вернуться в корзину
          </button>
        </div>
        {rules}
      </div>
    );
  }

  return (
    <div className="booking-checkout booking-checkout--success">
      <p className="booking-checkout__success-title">Бронь ждёт оплаты</p>
      <p className="booking-checkout__countdown">
        Если не оплатить, она отменится через{" "}
        <strong className="booking-checkout__countdown-time">
          {formatCountdown(secondsLeft ?? 0)}
        </strong>
      </p>
      <div className="booking-checkout__success-actions">
        <button
          type="button"
          className="booking-checkout__submit"
          disabled={isCancelling}
          onClick={openPayment}
        >
          Оплатить {result.prepayment.toLocaleString("ru-RU")} ₽
        </button>
        {canCancel ? (
          <button
            type="button"
            className="booking-checkout__secondary"
            disabled={isCancelling}
            onClick={() => void cancelAndBack()}
          >
            {isCancelling
              ? "Отменяем бронь…"
              : "Отменить бронь и вернуться в корзину"}
          </button>
        ) : null}
        {cancelError ? (
          <p className="booking-checkout__hint" role="alert">
            {cancelError}
          </p>
        ) : null}
      </div>
      {rules}
    </div>
  );
};
