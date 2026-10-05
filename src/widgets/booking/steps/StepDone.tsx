import React, { useEffect, useState } from "react";
import type { BookingResultDraft } from "../checkout/checkoutDraft";

type Props = {
  result: BookingResultDraft;
  onStartOver: () => void;
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

/** Обратный отсчёт оплаты от момента показа экрана успеха. */
function PaymentCountdown({ minutes }: { minutes: number }) {
  const [deadline] = useState(() => Date.now() + minutes * 60 * 1000);
  const [leftSec, setLeftSec] = useState(() =>
    Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setLeftSec(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 250);
    return () => window.clearInterval(id);
  }, [deadline]);

  if (leftSec <= 0) {
    return (
      <li className="booking-checkout__countdown booking-checkout__countdown--expired">
        Время на оплату истекло
      </li>
    );
  }

  return (
    <li className="booking-checkout__countdown">
      Оплатите в течение{" "}
      <strong className="booking-checkout__countdown-time">
        {formatCountdown(leftSec)}
      </strong>
    </li>
  );
}

/** Шаг 6: бронь создана. Оплата — только по кнопке, без авто-редиректа. */
export const StepDone: React.FC<Props> = ({ result, onStartOver }) => {
  const openPayment = () => {
    if (!result.paymentLink) return;
    window.open(result.paymentLink, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="booking-checkout booking-checkout--success">
      <p className="booking-checkout__success-title">Бронь создана</p>
      <p className="booking-checkout__success-text booking-checkout__success-text--pre">
        {result.message}
      </p>
      <ul className="booking-checkout__success-meta">
        <li>
          Стоимость{" "}
          <strong>
            {(result.price != null && result.price > 0
              ? result.price
              : result.totalFallback
            ).toLocaleString("ru-RU")}{" "}
            ₽
          </strong>
        </li>
        <li>
          Предоплата{" "}
          <strong>{result.prepayment.toLocaleString("ru-RU")} ₽</strong>
        </li>
        {result.timeoutMinutes != null && result.timeoutMinutes > 0 ? (
          <PaymentCountdown minutes={result.timeoutMinutes} />
        ) : null}
      </ul>
      <div className="booking-checkout__success-actions">
        {result.paymentLink ? (
          <button
            type="button"
            className="booking-checkout__submit"
            onClick={openPayment}
          >
            Перейти к оплате
          </button>
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
};
