import React, { useState } from "react";
import certImage from "../assets/cert.jpg";
import certElectronicDesktop from "../assets/cert3.jpg";
import certElectronicMobile from "../assets/cert2.jpg";
import { formatCertificateAmount } from "./amounts";
import {
  matchesCertificateFormat,
  type CertificateFormat,
} from "./certificateFormat";
import { MAX_CERTIFICATE_COUNT } from "./certificatePricing";
import type { CertificateLine } from "./certificateUrl";
import type { SaleCertificate } from "./parseCertificates";

const FORMAT_POINTS: Record<CertificateFormat, string[]> = {
  electronic: [
    "не ограничен в сроке действия",
    "действует на любые товары и услуги в LESу",
    "номинал от 1 000₽ до 99 000₽",
    "доступно частичное списание номинала",
    "отправка на эл. почту",
  ],
  paper: [
    "не ограничен в сроке действия",
    "действует на любые товары и услуги в LESу",
    "номинал 3000₽, 5000₽, 8000₽",
    "списание полной суммы номинала",
    "отправка Яндекс доставкой или самовывоз",
  ],
};

export type CertificateDraft = {
  certificateId: string;
  count: number;
  recipientName: string;
  promoCode: string;
  lines: CertificateLine[];
};

export type CertificatePickValues = {
  certificateId: string | null;
  count: number;
  recipientName: string;
  promoCode: string;
  format: CertificateFormat | null;
  email: string;
  lines: CertificateLine[];
};

type StepCertificateProps = {
  certificates: SaleCertificate[];
  tenantId: string | null;
  /** Стартовый вид, если в черновике его ещё нет. */
  format?: CertificateFormat;
  initial?: (Partial<CertificatePickValues> &
    Pick<CertificatePickValues, "certificateId" | "count" | "recipientName" | "promoCode">) | null;
  promoMessage?: string | null;
  /** Скидка, если текущий код уже проверен и подошёл. */
  promoDiscount?: number | null;
  busy?: boolean;
  /** Какая кнопка ждёт ответ проверки. */
  checking?: "promo" | "continue" | null;
  onValuesChange?: (values: CertificatePickValues) => void;
  onCheckPromo?: (promoCode: string, certificateIds: string[]) => void;
  onContinue?: (draft: CertificateDraft) => void;
};

export const StepCertificate: React.FC<StepCertificateProps> = ({
  certificates,
  format: formatProp,
  initial = null,
  busy = false,
  onValuesChange,
  onContinue,
}) => {
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    countsFromInitial(initial)
  );
  const [format, setFormat] = useState<CertificateFormat>(
    initial?.format ?? formatProp ?? "electronic"
  );
  const keptEmail = initial?.email ?? "";
  const keptPromo = initial?.promoCode ?? "";
  const visibleCertificates = certificates
    .filter((item) => matchesCertificateFormat(item.name, format))
    .slice()
    .sort((a, b) => a.price - b.price);
  const lines = linesFromCounts(counts, visibleCertificates);
  const [attempted, setAttempted] = useState(false);
  const nominalMissing = lines.length === 0;
  const showNominalError = attempted && nominalMissing;
  const publish = (
    patch: Partial<CertificatePickValues>,
    nextLines: CertificateLine[] = lines
  ) => {
    const nextFormat = patch.format === undefined ? format : patch.format;
    const nextEmail = nextFormat === "paper" ? "" : keptEmail;
    onValuesChange?.({
      certificateId: nextLines[0]?.id ?? null,
      count: nextLines[0]?.count ?? 1,
      promoCode: patch.promoCode === undefined ? keptPromo : patch.promoCode,
      ...patch,
      lines: patch.lines ?? nextLines,
      recipientName: "",
      email: nextEmail,
      format: nextFormat,
    });
  };

  const setQty = (id: string, nextCount: number) => {
    const nextCounts = { ...counts };
    if (nextCount <= 0) delete nextCounts[id];
    else nextCounts[id] = Math.min(MAX_CERTIFICATE_COUNT, Math.trunc(nextCount));
    setCounts(nextCounts);
    publish({}, linesFromCounts(nextCounts, visibleCertificates));
  };

  const chooseFormat = (next: CertificateFormat) => {
    setFormat(next);
    const nextLines = linesFromCounts(
      counts,
      certificates.filter((item) => matchesCertificateFormat(item.name, next))
    );
    publish({ format: next }, nextLines);
  };

  return (
    <section className="booking-certificate" aria-label="Подарочные сертификаты">
      <div className="booking-certificate__kind">
        <div
          className="booking-certificate__tabs"
          role="tablist"
          aria-label="Вид сертификата"
        >
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
          className="booking-certificate__panel"
        >
          <div
            className={
              format === "paper"
                ? "booking-certificate__lead booking-certificate__lead--paper"
                : "booking-certificate__lead"
            }
          >
            {format === "electronic" ? (
              <>
                <img
                  className="booking-certificate__art booking-certificate__art--desktop"
                  src={certElectronicDesktop}
                  alt=""
                />
                <img
                  className="booking-certificate__art booking-certificate__art--mobile"
                  src={certElectronicMobile}
                  alt=""
                />
              </>
            ) : (
              <img className="booking-certificate__art" src={certImage} alt="" />
            )}
            <div className="booking-certificate__points">
              <ul>
                {FORMAT_POINTS[format].map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
          <h3 className="booking-certificate__nominal-title">Выбор номинала</h3>
          {visibleCertificates.length === 0 ? (
            <p className="booking-certificate__empty">
              Таких сертификатов сейчас нет в продаже.
            </p>
          ) : (
            <div
              className={[
                "booking-certificate__nominals",
                showNominalError && "is-invalid",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {visibleCertificates.map((certificate) => {
                const qty = counts[certificate.id] ?? 0;
                const priceLabel = `${formatCertificateAmount(certificate.price)} ₽`;
                return (
                  <div
                    key={certificate.id}
                    className={[
                      "booking-certificate__nominal",
                      qty > 0 && "is-selected",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <p className="booking-certificate__nominal-price">{priceLabel}</p>
                    <div className="booking-qty">
                      <button
                        type="button"
                        className="booking-qty__btn"
                        aria-label={`Убрать ${priceLabel}`}
                        disabled={qty <= 0}
                        onClick={() => setQty(certificate.id, qty - 1)}
                      >
                        −
                      </button>
                      <span className="booking-qty__value" aria-live="polite">
                        {qty}
                      </span>
                      <button
                        type="button"
                        className="booking-qty__btn"
                        aria-label={`Добавить ${priceLabel}`}
                        disabled={qty >= MAX_CERTIFICATE_COUNT}
                        onClick={() => setQty(certificate.id, qty + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        className="booking-setup__continue"
        disabled={busy}
        onClick={() => {
          if (busy) return;
          setAttempted(true);
          if (nominalMissing) return;
          onContinue?.({
            certificateId: lines[0].id,
            count: lines[0].count,
            recipientName: "",
            promoCode: keptPromo.trim(),
            lines,
          });
        }}
      >
        Далее
      </button>
    </section>
  );
};

function countsFromInitial(
  initial: StepCertificateProps["initial"]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const line of initial?.lines ?? []) {
    if (line.id && line.count >= 1) {
      counts[line.id] = Math.min(MAX_CERTIFICATE_COUNT, Math.trunc(line.count));
    }
  }
  if (initial?.certificateId && counts[initial.certificateId] == null) {
    const count = initial.count ?? 1;
    if (count >= 1) {
      counts[initial.certificateId] = Math.min(
        MAX_CERTIFICATE_COUNT,
        Math.trunc(count)
      );
    }
  }
  return counts;
}

function linesFromCounts(
  counts: Record<string, number>,
  certificates: SaleCertificate[]
): CertificateLine[] {
  return certificates
    .filter((item) => (counts[item.id] ?? 0) >= 1)
    .map((item) => ({
      id: item.id,
      count: Math.min(MAX_CERTIFICATE_COUNT, Math.trunc(counts[item.id])),
    }));
}
