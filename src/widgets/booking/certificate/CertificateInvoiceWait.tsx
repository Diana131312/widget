import React, { useEffect, useState } from "react";
import { InvoicePaymentPanel } from "../checkout/InvoicePaymentPanel";
import type { CertificateInvoiceOrder } from "./certificateInvoice";

type Props = {
  order: CertificateInvoiceOrder;
  phone: string;
  email: string;
  onIssued?: () => void;
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

function useSecondsLeft(minutes: number | null): number | null {
  const [deadline] = useState(() =>
    minutes != null && minutes > 0 ? Date.now() + minutes * 60 * 1000 : null
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

/** Ожидание счёта после покупки сертификата. Ссылку на оплату не открываем. */
export const CertificateInvoiceWait: React.FC<Props> = ({
  order,
  phone,
  email,
  onIssued,
}) => {
  const [sent, setSent] = useState(false);
  const secondsLeft = useSecondsLeft(order.timeoutMinutes);

  return (
    <div className="booking-checkout booking-checkout--success">
      <p className="booking-checkout__success-title">
        {sent ? "Счёт отправлен" : "Ожидание выставления счёта"}
      </p>
      {secondsLeft != null && !sent ? (
        <p className="booking-checkout__countdown">
          Если не сформировать счёт на оплату, бронь отменится через{" "}
          <strong className="booking-checkout__countdown-time">
            {formatCountdown(secondsLeft)}
          </strong>
        </p>
      ) : null}
      <InvoicePaymentPanel
        bookingId={order.id}
        daily={false}
        scope={order.scope}
        phone={phone}
        email={email}
        onIssued={() => {
          setSent(true);
          onIssued?.();
        }}
      />
    </div>
  );
};
