import React, { useState } from "react";
import { ServiceOfferModal } from "../checkout/ServiceOfferModal";
import {
  formatRuPhoneMask,
  isRuPhoneComplete,
} from "../checkout/phone";
import { getValidAuthToken } from "../checkout/authToken";
import { formatCertificateAmount } from "./amounts";
import { isCertificateEmail } from "./certificateApi";
import type { CertificateMessenger } from "./certificateUrl";
import {
  certificatePayAmount,
  formatCertificateQty,
  formatCertificateTerm,
} from "./certificatePricing";
import type { SaleCertificate } from "./parseCertificates";
import type { CertificateDraft } from "./StepCertificate";

export type CertificateBuyerValues = {
  lastName: string;
  firstName: string;
  phone: string;
  email: string;
  messenger: CertificateMessenger;
  termsAccepted: boolean;
};

type CertificateBuyerSeed = Omit<CertificateBuyerValues, "messenger"> & {
  messenger: CertificateMessenger | "";
};

type StepCertificateBuyerProps = {
  certificate: SaleCertificate;
  draft: CertificateDraft;
  /** null — промокод ещё проверяется */
  discountPercent: number | null;
  initialBuyer?: CertificateBuyerSeed | null;
  promoMessage?: string | null;
  payError?: string | null;
  /** Повторная проверка промокода */
  busy?: boolean;
  /** Уходит запрос на создание покупки */
  submitting?: boolean;
  telegramBotHref?: string | null;
  /** false — почта уже задана на предыдущем шаге или подставляется для бумаги */
  showEmail?: boolean;
  paperDelivery?: boolean;
  onBuyerChange?: (buyer: Partial<CertificateBuyerValues>) => void;
  onPay?: (buyer: CertificateBuyerValues) => void;
};

export const StepCertificateBuyer: React.FC<StepCertificateBuyerProps> = ({
  certificate,
  draft,
  discountPercent,
  initialBuyer = null,
  promoMessage = null,
  payError = null,
  busy = false,
  submitting = false,
  telegramBotHref = null,
  showEmail = true,
  paperDelivery = false,
  onBuyerChange,
  onPay,
}) => {
  const [lastName, setLastName] = useState(initialBuyer?.lastName ?? "");
  const [firstName, setFirstName] = useState(initialBuyer?.firstName ?? "");
  const [phone, setPhone] = useState(initialBuyer?.phone ?? "");
  const [email, setEmail] = useState(initialBuyer?.email ?? "");
  const [messenger, setMessenger] = useState<CertificateMessenger>(
    initialBuyer?.messenger === "max" || initialBuyer?.messenger === "call"
      ? initialBuyer.messenger
      : "telegram"
  );
  const [termsAccepted, setTermsAccepted] = useState(
    initialBuyer?.termsAccepted ?? false
  );
  const [offerOpen, setOfferOpen] = useState(false);

  const publish = (next: Partial<CertificateBuyerValues>) => {
    onBuyerChange?.(next);
  };

  const payAmount =
    discountPercent == null
      ? null
      : certificatePayAmount(certificate.price, draft.count, discountPercent);
  const payLabel =
    payAmount == null ? "…" : `${formatCertificateAmount(payAmount)} ₽`;
  const phoneOk = isRuPhoneComplete(phone);
  const emailOk = isCertificateEmail(email);
  const phoneConfirmed = phoneOk && getValidAuthToken(phone) != null;
  const formValid =
    lastName.trim().length >= 1 &&
    firstName.trim().length >= 1 &&
    phoneOk &&
    (!showEmail || emailOk) &&
    termsAccepted;
  const promoPending = Boolean(draft.promoCode) && discountPercent == null;
  const canPay = formValid && !promoPending && !busy && !submitting;

  const promoApplied = Boolean(draft.promoCode) && (discountPercent ?? 0) > 0;

  return (
    <div className="booking-checkout">
      <div className="booking-checkout__main">
        <div className="booking-price-breakdown booking-checkout-summary">
          <ul className="booking-price-breakdown__meta">
            <li className="booking-price-breakdown__row">
              <span>Сертификат</span>
              <span className="booking-price-breakdown__num">
                {formatCertificateQty(draft.count, certificate.price)}
              </span>
            </li>
            <li className="booking-price-breakdown__row">
              <span>Срок сертификата</span>
              <span className="booking-price-breakdown__num">
                {formatCertificateTerm(certificate.durationMonths)}
              </span>
            </li>
            {paperDelivery ? null : (
              <li className="booking-price-breakdown__row">
                <span>Получатель</span>
                <span className="booking-price-breakdown__num">
                  {draft.recipientName || "Не указано"}
                </span>
              </li>
            )}
            {promoApplied ? (
              <>
                <li className="booking-price-breakdown__row">
                  <span>Промокод</span>
                  <span className="booking-price-breakdown__num booking-certificate__discount">
                    {draft.promoCode} {discountPercent}%
                  </span>
                </li>
                <li className="booking-certificate__nominal-note">
                  * Скидка уменьшает только оплату, номинал сертификата
                  остаётся полным
                </li>
              </>
            ) : null}
          </ul>
          <div className="booking-price-breakdown__row booking-price-breakdown__row--total">
            <span>К оплате</span>
            <span className="booking-price-breakdown__num">{payLabel}</span>
          </div>
        </div>

        {promoMessage ? (
          <p className="booking-checkout__hint" role="alert">
            {promoMessage}
          </p>
        ) : null}

        <div className="booking-checkout__fields">
          <div className="booking-checkout__field">
            <label className="booking-checkout__label" htmlFor="bk-cert-last">
              Фамилия покупателя
            </label>
            <input
              id="bk-cert-last"
              className="booking-checkout__input"
              value={lastName}
              autoComplete="family-name"
              placeholder="Иванов"
              onChange={(event) => {
                const next = event.target.value;
                setLastName(next);
                publish({ lastName: next });
              }}
            />
          </div>
          <div className="booking-checkout__field">
            <label className="booking-checkout__label" htmlFor="bk-cert-first">
              Имя покупателя
            </label>
            <input
              id="bk-cert-first"
              className="booking-checkout__input"
              value={firstName}
              autoComplete="given-name"
              placeholder="Иван"
              onChange={(event) => {
                const next = event.target.value;
                setFirstName(next);
                publish({ firstName: next });
              }}
            />
          </div>
          <div className="booking-checkout__field">
            <label className="booking-checkout__label" htmlFor="bk-cert-phone">
              Телефон покупателя
            </label>
            <input
              id="bk-cert-phone"
              className="booking-checkout__input"
              type="tel"
              inputMode="numeric"
              value={phone}
              autoComplete="tel"
              placeholder="+7 (900) 000-00-00"
              onChange={(event) => {
                const next = formatRuPhoneMask(event.target.value);
                setPhone(next);
                publish({ phone: next });
              }}
            />
            {!phoneOk && phone.length > 0 ? (
              <p className="booking-checkout__hint">Укажите полный номер</p>
            ) : null}
          </div>
          {showEmail ? (
          <div className="booking-checkout__field">
            <label className="booking-checkout__label" htmlFor="bk-cert-email">
              Email
              <span className="booking-certificate__required" aria-hidden="true">
                *
              </span>
            </label>
            <p className="booking-certificate__email-note">
              На эту почту придёт сертификат
            </p>
            <input
              id="bk-cert-email"
              className="booking-checkout__input"
              type="email"
              inputMode="email"
              required
              name="certificate-email"
              autoComplete="email"
              placeholder="ivan@mail.ru"
              aria-required="true"
              value={email}
              onChange={(event) => {
                const next = event.target.value;
                setEmail(next);
                publish({ email: next });
              }}
            />
            {email.length > 0 && !emailOk ? (
              <p className="booking-checkout__hint">Укажите почту полностью</p>
            ) : null}
          </div>
          ) : null}
        </div>

        {phoneConfirmed ? (
          <p className="booking-checkout__channel-note">
            Номер уже подтверждён — повторное подтверждение не нужно
          </p>
        ) : (
          <fieldset className="booking-checkout__messenger">
            <legend className="booking-checkout__label">
              Как подтвердить номер
            </legend>
            <div className="booking-checkout__radio-group">
              {(
                [
                  ["telegram", "Telegram"],
                  ["max", "MAX"],
                  ["call", "По телефону"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="booking-checkout__radio">
                  <input
                    type="radio"
                    name="bk-cert-verify"
                    checked={messenger === value}
                    onChange={() => {
                      setMessenger(value);
                      publish({ messenger: value });
                    }}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            {messenger === "telegram" ? (
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

        <div className="booking-checkout__consents">
          <label className="booking-checkout__privacy">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => {
                const next = event.target.checked;
                setTermsAccepted(next);
                publish({ termsAccepted: next });
              }}
            />
            <span>
              Я соглашаюсь с условиями{" "}
              <button
                type="button"
                className="booking-checkout__terms-link"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setOfferOpen(true);
                }}
              >
                бронирования услуг
              </button>
            </span>
          </label>
        </div>

        {payError ? (
          <div className="booking-checkout__error" role="alert">
            <p className="booking-checkout__error-detail">{payError}</p>
          </div>
        ) : null}
      </div>

      <div className="booking-checkout__footer">
        <button
          type="button"
          className="booking-checkout__submit"
          disabled={!canPay}
          onClick={() => {
            if (!canPay) return;
            onPay?.({
              lastName: lastName.trim(),
              firstName: firstName.trim(),
              phone,
              email: email.trim(),
              messenger,
              termsAccepted,
            });
          }}
        >
          {submitting ? "Создаём заказ…" : `Оплатить ${payLabel}`}
        </button>
      </div>

      <ServiceOfferModal open={offerOpen} onClose={() => setOfferOpen(false)} />
    </div>
  );
};
