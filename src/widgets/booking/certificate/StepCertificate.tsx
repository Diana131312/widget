import React, { useState } from "react";
import { resolveBookingImageUrl } from "../media/imageCache";
import { formatCertificateAmount } from "./amounts";
import { isCertificateEmail } from "./certificateApi";
import {
  matchesCertificateFormat,
  type CertificateFormat,
} from "./certificateFormat";
import {
  MAX_CERTIFICATE_COUNT,
  clampCertificateCount,
  formatDurationMonths,
} from "./certificatePricing";
import type { SaleCertificate } from "./parseCertificates";

export type CertificateDraft = {
  certificateId: string;
  count: number;
  recipientName: string;
  promoCode: string;
};

export type CertificatePickValues = {
  certificateId: string | null;
  count: number;
  recipientName: string;
  promoCode: string;
  format: CertificateFormat | null;
  email: string;
};

type StepCertificateProps = {
  certificates: SaleCertificate[];
  tenantId: string | null;
  initial?: (Partial<CertificatePickValues> &
    Pick<CertificatePickValues, "certificateId" | "count" | "recipientName" | "promoCode">) | null;
  promoMessage?: string | null;
  /** Скидка, если текущий код уже проверен и подошёл. */
  promoDiscount?: number | null;
  busy?: boolean;
  /** Какая кнопка ждёт ответ проверки. */
  checking?: "promo" | "continue" | null;
  onValuesChange?: (values: CertificatePickValues) => void;
  onCheckPromo?: (promoCode: string, certificateId: string) => void;
  onContinue?: (draft: CertificateDraft) => void;
};

export const StepCertificate: React.FC<StepCertificateProps> = ({
  certificates,
  tenantId,
  initial = null,
  promoMessage = null,
  promoDiscount = null,
  busy = false,
  checking = null,
  onValuesChange,
  onCheckPromo,
  onContinue,
}) => {
  const [certificateId, setCertificateId] = useState<string | null>(
    initial?.certificateId ?? null
  );
  const [count, setCount] = useState(clampCertificateCount(initial?.count ?? 1));
  const [recipientName, setRecipientName] = useState(
    initial?.recipientName ?? ""
  );
  const [promoCode, setPromoCode] = useState(initial?.promoCode ?? "");
  const [format, setFormat] = useState<CertificateFormat>(
    initial?.format ?? "electronic"
  );
  const [email, setEmail] = useState(initial?.email ?? "");
  const selected = certificates.find((item) => item.id === certificateId) ?? null;
  const visibleCertificates = certificates.filter((item) =>
    matchesCertificateFormat(item.name, format)
  );
  const promo = promoCode.trim();
  const emailOk = isCertificateEmail(email);
  const promoOk = promoDiscount != null && promoDiscount > 0 && !promoMessage;
  const promoBad = Boolean(promo) && Boolean(promoMessage);
  const selectedVisible =
    selected != null &&
    visibleCertificates.some((item) => item.id === selected.id);
  const canCheck = selectedVisible && promo.length > 0 && !busy && !promoOk && !promoBad;
  const showDetails = format != null;
  const needsEmail = format === "electronic";
  const canContinue = selectedVisible && (!needsEmail || emailOk) && !busy;

  const publish = (patch: Partial<CertificatePickValues>) => {
    const nextFormat = patch.format === undefined ? format : patch.format;
    const nextRecipient =
      nextFormat === "paper"
        ? ""
        : patch.recipientName === undefined
          ? recipientName
          : patch.recipientName;
    const nextEmail =
      nextFormat === "paper"
        ? ""
        : patch.email === undefined
          ? email
          : patch.email;
    onValuesChange?.({
      certificateId,
      count,
      promoCode,
      ...patch,
      recipientName: nextRecipient,
      email: nextEmail,
      format: nextFormat,
    });
  };

  const chooseFormat = (next: CertificateFormat) => {
    const keep =
      selected != null && matchesCertificateFormat(selected.name, next)
        ? selected.id
        : null;
    setFormat(next);
    if (!keep) {
      setCertificateId(null);
      setCount(1);
    }
    if (next === "paper") {
      setRecipientName("");
      setEmail("");
    }
    publish({
      format: next,
      certificateId: keep,
      count: keep ? count : 1,
      recipientName: next === "paper" ? "" : recipientName,
      email: next === "paper" ? "" : email,
    });
  };

  return (
    <section className="booking-certificate" aria-label="Подарочные сертификаты">
      <div className="booking-certificate__kind">
      <div className="booking-certificate__tabs" role="tablist" aria-label="Вид сертификата">
        <button
          type="button"
          role="tab"
          id="bk-cert-tab-electronic"
          aria-selected={format === "electronic"}
          aria-controls="bk-cert-format-panel"
          className="booking-certificate__tab"
          onClick={() => chooseFormat("electronic")}
        >
          Электронный
        </button>
        <button
          type="button"
          role="tab"
          id="bk-cert-tab-paper"
          aria-selected={format === "paper"}
          aria-controls="bk-cert-format-panel"
          className="booking-certificate__tab"
          onClick={() => chooseFormat("paper")}
        >
          Бумажный
        </button>
      </div>

      <div
        role="tabpanel"
        id="bk-cert-format-panel"
        aria-labelledby={
          format === "paper" ? "bk-cert-tab-paper" : "bk-cert-tab-electronic"
        }
        className="booking-certificate__points"
      >
        <ul>
          {(format === "electronic"
            ? [
                { text: "Придёт на почту после оплаты", limit: false },
                { text: "Можно оплатить часть суммы", limit: false },
              ]
            : [
                { text: "Можно вручить лично", limit: false },
                { text: "Крафтовый конверт", limit: false },
                { text: "Самовывоз или Яндекс Доставка", limit: false },
                { text: "Частичная оплата недоступна", limit: true },
              ]
          ).map((point) => (
            <li key={point.text} className={point.limit ? "is-limit" : undefined}>
              <span aria-hidden="true">{point.limit ? "−" : "+"}</span>
              {point.text}
            </li>
          ))}
        </ul>
      </div>
      </div>

      {format && visibleCertificates.length === 0 ? (
        <p className="booking-certificate__empty">
          Таких сертификатов сейчас нет в продаже.
        </p>
      ) : null}

      <div className="booking-product-grid">
        {visibleCertificates.map((certificate) => {
          const isSelected = certificate.id === certificateId;
          const logo = resolveBookingImageUrl(certificate.logo, tenantId, 400);
          const priceLabel = `${formatCertificateAmount(certificate.price)} ₽`;
          const detail =
            certificate.description ||
            formatDurationMonths(certificate.durationMonths);
          const setQty = (nextCount: number) => {
            if (nextCount <= 0) {
              setCertificateId(null);
              setCount(1);
              publish({
                certificateId: null,
                count: 1,
                recipientName,
                promoCode,
              });
              return;
            }
            const next = clampCertificateCount(nextCount);
            setCertificateId(certificate.id);
            setCount(next);
            publish({
              certificateId: certificate.id,
              count: next,
              recipientName,
              promoCode,
            });
          };
          return (
            <article
              key={certificate.id}
              className={[
                "booking-product-card",
                isSelected && "booking-product-card--selected",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="booking-product-card__media">
                {logo ? (
                  <CertificateLogo src={logo} />
                ) : (
                  <div className="booking-product-card__placeholder">
                    <span>сертификат</span>
                  </div>
                )}
              </div>
              <div className="booking-product-card__meta">
                <p className="booking-product-card__name">
                  {certificate.name}
                  <span className="booking-certificate__card-term">{detail}</span>
                </p>
                <p className="booking-product-card__price">{priceLabel}</p>
              </div>
              {isSelected ? (
                <div className="booking-product-card__qty booking-qty">
                  <button
                    type="button"
                    className="booking-qty__btn"
                    aria-label={`Убрать ${certificate.name}`}
                    onClick={() => setQty(count - 1)}
                  >
                    −
                  </button>
                  <span className="booking-qty__value" aria-live="polite">
                    {count}
                  </span>
                  <button
                    type="button"
                    className="booking-qty__btn"
                    aria-label={`Добавить ещё ${certificate.name}`}
                    disabled={count >= MAX_CERTIFICATE_COUNT}
                    onClick={() => setQty(count + 1)}
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="booking-product-card__add"
                  aria-label={`Добавить ${certificate.name}`}
                  onClick={() => setQty(1)}
                >
                  Добавить
                </button>
              )}
            </article>
          );
        })}
      </div>

      {showDetails && format === "electronic" ? (
        <label className="booking-checkout__field">
          <span className="booking-checkout__label">Имя получателя</span>
          <input
            className="booking-checkout__input"
            name="certificate-recipient"
            autoComplete="off"
            placeholder="На сертификате, можно не указывать"
            value={recipientName}
            onChange={(event) => {
              const next = event.target.value;
              setRecipientName(next);
              publish({ certificateId, count, recipientName: next, promoCode });
            }}
          />
        </label>
      ) : null}

      {needsEmail ? (
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

      {showDetails ? (
      <>
      <div className="booking-checkout__field">
        <label className="booking-checkout__label" htmlFor="bk-cert-promo">
          Промокод
        </label>
        <div className="booking-certificate__promo-row">
          <input
            id="bk-cert-promo"
            className="booking-checkout__input"
            name="certificate-promo"
            autoComplete="off"
            placeholder="Если есть"
            value={promoCode}
            onChange={(event) => {
              const next = event.target.value;
              setPromoCode(next);
              publish({
                certificateId,
                count,
                recipientName,
                promoCode: next,
              });
            }}
          />
          {promoOk ? (
            <span
              className="booking-certificate__promo-mark booking-certificate__promo-mark--ok"
              role="img"
              aria-label={`Скидка ${promoDiscount}%`}
            >
              ✓ {promoDiscount}%
            </span>
          ) : promoBad ? (
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
              disabled={!canCheck}
              onClick={() => {
                if (!selected || !promo || busy) return;
                onCheckPromo?.(promo, selected.id);
              }}
            >
              {checking === "promo" ? "…" : "Проверить"}
            </button>
          )}
        </div>
      </div>
      {promoBad && promoMessage ? (
        <p className="booking-certificate__promo-error" role="alert">
          {promoMessage}
        </p>
      ) : null}

      <button
        type="button"
        className="booking-setup__continue"
        disabled={!canContinue}
        onClick={() => {
          if (!selected || busy) return;
          onContinue?.({
            certificateId: selected.id,
            count,
            recipientName: format === "paper" ? "" : recipientName.trim(),
            promoCode: promoCode.trim(),
          });
        }}
      >
        {checking === "continue" ? "Проверяем промокод…" : "Далее"}
      </button>
      </>
      ) : null}
    </section>
  );
};

const CertificateLogo: React.FC<{ src: string }> = ({ src }) => {
  const [hidden, setHidden] = useState(false);
  if (hidden) {
    return (
      <div className="booking-product-card__placeholder">
        <span>сертификат</span>
      </div>
    );
  }
  return (
    <img
      className="booking-product-card__img"
      src={src}
      alt=""
      onError={() => setHidden(true)}
    />
  );
};
