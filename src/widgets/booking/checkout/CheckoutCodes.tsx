import React from "react";
import { formatCertificateAmount } from "../certificate/amounts";
import type { CheckedCertificate } from "./bookingPay";

export type CodeMark = "idle" | "ok" | "bad";

type Props = {
  promoCode: string;
  promoMark: CodeMark;
  promoPercent: number | null;
  promoError: string | null;
  certificateNumber: string;
  certificateMark: CodeMark;
  certificateInfo: CheckedCertificate | null;
  certificateError: string | null;
  busy: boolean;
  onPromoChange: (value: string) => void;
  onCertificateChange: (value: string) => void;
  onCheckPromo: () => void;
  onCheckCertificate: () => void;
};

export const CheckoutCodes: React.FC<Props> = ({
  promoCode,
  promoMark,
  promoPercent,
  promoError,
  certificateNumber,
  certificateMark,
  certificateInfo,
  certificateError,
  busy,
  onPromoChange,
  onCertificateChange,
  onCheckPromo,
  onCheckCertificate,
}) => {
  const promo = promoCode.trim();
  const certificate = certificateNumber.trim();

  return (
    <>
      <div className="booking-checkout__field">
        <label className="booking-checkout__label" htmlFor="bk-promo">
          Промокод
        </label>
        <div className="booking-certificate__promo-row">
          <input
            id="bk-promo"
            className="booking-checkout__input"
            name="booking-promo"
            autoComplete="off"
            placeholder="Если есть"
            value={promoCode}
            disabled={busy}
            onChange={(event) => onPromoChange(event.target.value)}
          />
          {promoMark === "ok" && promoPercent != null ? (
            <span
              className="booking-certificate__promo-mark booking-certificate__promo-mark--ok"
              role="img"
              aria-label={`Скидка ${promoPercent}%`}
            >
              ✓ {promoPercent}%
            </span>
          ) : promoMark === "bad" ? (
            <span
              className="booking-certificate__promo-mark booking-certificate__promo-mark--bad"
              role="img"
              aria-label="Промокод не подошёл"
            >
              ✕
            </span>
          ) : (
            <button
              type="button"
              className={[
                "booking-certificate__promo-check",
                promo && "booking-certificate__promo-check--ready",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={!promo || busy}
              onClick={onCheckPromo}
            >
              Проверить
            </button>
          )}
        </div>
        {promoError ? (
          <p className="booking-certificate__promo-error" role="alert">
            {promoError}
          </p>
        ) : null}
      </div>

      <div className="booking-checkout__field">
        <label className="booking-checkout__label" htmlFor="bk-certificate">
          Сертификат
        </label>
        <div className="booking-certificate__promo-row">
          <input
            id="bk-certificate"
            className="booking-checkout__input"
            name="booking-certificate"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Номер сертификата"
            value={certificateNumber}
            disabled={busy}
            onChange={(event) => onCertificateChange(event.target.value)}
          />
          {certificateMark === "ok" && certificateInfo ? (
            <span
              className="booking-certificate__promo-mark booking-certificate__promo-mark--ok"
              role="img"
              aria-label={`${certificateInfo.name}, остаток ${formatCertificateAmount(certificateInfo.balance)} ₽`}
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
                certificate && "booking-certificate__promo-check--ready",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={!certificate || busy}
              onClick={onCheckCertificate}
            >
              Проверить
            </button>
          )}
        </div>
        {certificateMark === "ok" && certificateInfo ? (
          <p className="booking-checkout__hint">
            {certificateInfo.name} · остаток{" "}
            {formatCertificateAmount(certificateInfo.balance)} ₽
          </p>
        ) : null}
        {certificateError ? (
          <p className="booking-certificate__promo-error" role="alert">
            {certificateError}
          </p>
        ) : null}
      </div>
    </>
  );
};
