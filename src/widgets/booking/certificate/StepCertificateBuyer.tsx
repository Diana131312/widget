import React, { useEffect, useState } from "react";
import { getAuthProfile } from "../checkout/authToken";
import { ServiceOfferModal } from "../checkout/ServiceOfferModal";
import {
  formatRuPhoneMask,
  isRuPhoneComplete,
} from "../checkout/phone";
import { PromoCodeField, type CodeMark } from "../ui/PromoCodeField";
import { formatCertificateAmount } from "./amounts";
import { isCertificateEmail } from "./certificateApi";
import type { CertificateMessenger } from "./certificateUrl";
import {
  certificatePayAmount,
  formatCertificateQty,
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
  /** Счёт на юрлицо вместо перехода на ссылку оплаты. */
  payByInvoice: boolean;
  /** Куда отправить PDF, если выбрана оплата с р/счета. */
  invoiceEmail: string;
};

type CertificateBuyerSeed = Omit<
  CertificateBuyerValues,
  "messenger" | "payByInvoice" | "invoiceEmail"
> & {
  messenger: CertificateMessenger | "";
  payByInvoice?: boolean;
  invoiceEmail?: string;
};

type StepCertificateBuyerProps = {
  certificate: SaleCertificate;
  /** Все выбранные номиналы. Если не переданы, показывается один сертификат. */
  items?: { certificate: SaleCertificate; count: number }[];
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
  /** Электронный сертификат: почта нужна, чтобы отправить сертификат. */
  showEmail?: boolean;
  promoMark?: CodeMark;
  promoPercent?: number | null;
  promoChecking?: boolean;
  onPromoChange?: (promoCode: string) => void;
  onCheckPromo?: () => void;
  /** Меняется, когда профиль авторизации догрузился. */
  authVersion?: number;
  onBuyerChange?: (buyer: Partial<CertificateBuyerValues>) => void;
  onPay?: (buyer: CertificateBuyerValues) => void;
};

export const StepCertificateBuyer: React.FC<StepCertificateBuyerProps> = ({
  certificate,
  items,
  draft,
  discountPercent,
  initialBuyer = null,
  promoMessage = null,
  payError = null,
  busy = false,
  submitting = false,
  showEmail = true,
  promoMark = "idle",
  promoPercent = null,
  promoChecking = false,
  onPromoChange,
  onCheckPromo,
  authVersion = 0,
  onBuyerChange,
  onPay,
}) => {
  const [authProfile] = useState(() => getAuthProfile());
  const [lastName, setLastName] = useState(
    initialBuyer?.lastName || authProfile?.lastName || ""
  );
  const [firstName, setFirstName] = useState(
    initialBuyer?.firstName || authProfile?.firstName || ""
  );
  const [phone, setPhone] = useState(
    initialBuyer?.phone ||
      (authProfile ? formatRuPhoneMask(authProfile.phone) : "")
  );
  const [email, setEmail] = useState(initialBuyer?.email ?? "");
  const [termsAccepted, setTermsAccepted] = useState(
    initialBuyer?.termsAccepted ?? false
  );
  const [offerOpen, setOfferOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const publish = (next: Partial<CertificateBuyerValues>) => {
    onBuyerChange?.(next);
  };

  useEffect(() => {
    const profile = getAuthProfile();
    if (!profile) return;
    setLastName((value) => value || profile.lastName);
    setFirstName((value) => value || profile.firstName);
    setPhone((value) => value || formatRuPhoneMask(profile.phone));
  }, [authVersion]);

  const rows =
    items && items.length > 0
      ? items
      : [{ certificate, count: draft.count }];
  const payAmount =
    discountPercent == null
      ? null
      : rows.reduce(
          (sum, row) =>
            sum +
            certificatePayAmount(row.certificate.price, row.count, discountPercent),
          0
        );
  const payLabel =
    payAmount == null ? "…" : `${formatCertificateAmount(payAmount)} ₽`;
  const phoneOk = isRuPhoneComplete(phone);
  const emailOk = isCertificateEmail(email);
  const formValid =
    lastName.trim().length >= 1 &&
    firstName.trim().length >= 1 &&
    phoneOk &&
    (!showEmail || emailOk) &&
    termsAccepted;
  const promoPending = Boolean(draft.promoCode) && discountPercent == null;
  const canPay = formValid && !promoPending;
  const inputClass = (invalid: boolean) =>
    invalid
      ? "booking-checkout__input booking-checkout__input--invalid"
      : "booking-checkout__input";

  const promoApplied = Boolean(draft.promoCode) && (discountPercent ?? 0) > 0;

  return (
    <div className="booking-checkout">
      <div className="booking-checkout__main">
        <div className="booking-price-breakdown booking-checkout-summary">
          <ul className="booking-price-breakdown__meta">
            {rows.map((row) => (
              <li key={row.certificate.id} className="booking-price-breakdown__row">
                <span>Сертификат</span>
                <span className="booking-price-breakdown__num">
                  {formatCertificateQty(row.count, row.certificate.price)}
                </span>
              </li>
            ))}
            <li className="booking-price-breakdown__row">
              <span>Срок сертификата</span>
              <span className="booking-price-breakdown__num">не ограничен</span>
            </li>
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

        <div className="booking-checkout__fields">
          <div className="booking-checkout__field">
            <label className="booking-checkout__label" htmlFor="bk-cert-last">
              Фамилия покупателя
            </label>
            <input
              id="bk-cert-last"
              className={inputClass(attempted && lastName.trim().length < 1)}
              aria-invalid={attempted && lastName.trim().length < 1}
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
              className={inputClass(attempted && firstName.trim().length < 1)}
              aria-invalid={attempted && firstName.trim().length < 1}
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
              className={inputClass(attempted && !phoneOk)}
              aria-invalid={attempted && !phoneOk}
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
            {(attempted || phone.length > 0) && !phoneOk ? (
              <p className="booking-checkout__hint">Укажите полный номер</p>
            ) : null}
          </div>
          {showEmail ? (
            <div className="booking-checkout__field">
              <label className="booking-checkout__label" htmlFor="bk-cert-email">
                Почта для отправки сертификата
                <span className="booking-certificate__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="bk-cert-email"
                className={inputClass(attempted && !emailOk)}
                aria-invalid={attempted && !emailOk}
                type="email"
                inputMode="email"
                required
                name="certificate-email"
                autoComplete="email"
                placeholder="ivan@mail.ru"
                aria-required="true"
                value={email}
                disabled={submitting}
                onChange={(event) => {
                  const next = event.target.value;
                  setEmail(next);
                  publish({ email: next });
                }}
              />
              {(attempted || email.length > 0) && !emailOk ? (
                <p className="booking-checkout__hint">Укажите почту полностью</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <hr className="booking-checkout__rule" />

        <PromoCodeField
            id="bk-cert-promo"
            name="certificate-promo"
            value={draft.promoCode}
            mark={promoMark}
            percent={promoPercent}
            error={promoMark === "bad" ? promoMessage : null}
            checking={promoChecking}
            checkDisabled={busy || submitting}
            onChange={(next) => onPromoChange?.(next)}
            onCheck={() => onCheckPromo?.()}
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
          disabled={busy || submitting}
          onClick={() => {
            if (!canPay) {
              setAttempted(true);
              return;
            }
            onPay?.({
              lastName: lastName.trim(),
              firstName: firstName.trim(),
              phone,
              email: showEmail ? email.trim() : "",
              invoiceEmail: "",
              messenger: "telegram",
              termsAccepted,
              payByInvoice: false,
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
