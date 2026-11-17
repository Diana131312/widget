import React, { useCallback, useEffect, useState } from "react";
import { toApiPhone } from "../checkout/phone";
import { getWidgetApiErrorDetail } from "../ui/errorMessages";
import { BookingLoader } from "../ui/BookingLoader";
import { BootstrapError } from "../ui/BootstrapError";
import {
  checkCertificatePromo,
  promoAppliesTo,
  rejectPromoMessage,
  saveCertificatePurchase,
} from "./certificateApi";
import type { CertificateBuyerValues } from "./StepCertificateBuyer";
import type { CertificateUrlState } from "./certificateUrl";
import { clampCertificateCount } from "./certificatePricing";
import type { SaleCertificate } from "./parseCertificates";
import { StepCertificate } from "./StepCertificate";
import { StepCertificateBuyer } from "./StepCertificateBuyer";

type PromoVerdict = {
  code: string;
  certificateId: string;
  discount: number;
  message: string | null;
};

function samePromo(
  verdict: PromoVerdict | null,
  code: string,
  certificateId: string | null
): verdict is PromoVerdict {
  return (
    verdict != null &&
    certificateId != null &&
    verdict.code === code &&
    verdict.certificateId === certificateId
  );
}

type CertificateFlowProps = {
  state: CertificateUrlState;
  /** Меняется при восстановлении из адреса, чтобы поля перечитали URL. */
  restoreKey: number;
  certificates: SaleCertificate[];
  catalogStatus: "idle" | "loading" | "ready" | "error";
  catalogError?: unknown;
  tenantId: string | null;
  onRetryCatalog?: () => void;
  onChange: (patch: Partial<CertificateUrlState>) => void;
  onPickContinue: () => void;
};

/** Выбор сертификата и оплата. Поля живут в адресе страницы. */
export const CertificateFlow: React.FC<CertificateFlowProps> = ({
  state,
  restoreKey,
  certificates,
  catalogStatus,
  catalogError = null,
  tenantId,
  onRetryCatalog,
  onChange,
  onPickContinue,
}) => {
  const [discount, setDiscount] = useState<number | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<PromoVerdict | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [checking, setChecking] = useState<"promo" | "continue" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selected =
    certificates.find((item) => item.id === state.certificateId) ?? null;

  useEffect(() => {
    if (catalogStatus !== "ready") return;
    if (state.phase !== "buyer") return;
    if (selected) return;
    onChange({ phase: "pick" });
  }, [catalogStatus, onChange, selected, state.phase]);

  const applyPromo = useCallback(async (code: string, certificateId: string) => {
    const result = await checkCertificatePromo({
      promoCode: code,
      certificateTypeIds: [certificateId],
    });
    const next: PromoVerdict = promoAppliesTo(result, certificateId)
      ? {
          code,
          certificateId,
          discount: result.discount,
          message: null,
        }
      : {
          code,
          certificateId,
          discount: 0,
          message: rejectPromoMessage(result, certificateId),
        };
    setVerdict(next);
    setDiscount(next.discount);
    setPromoMessage(next.message);
    return next;
  }, []);

  useEffect(() => {
    if (state.phase !== "buyer" || !state.certificateId) return;
    const code = state.promoCode.trim();
    if (!code) {
      setDiscount(0);
      setPromoMessage(null);
      return;
    }
    if (samePromo(verdict, code, state.certificateId)) {
      setDiscount(verdict.discount);
      setPromoMessage(verdict.message);
      return;
    }

    let cancelled = false;
    void applyPromo(code, state.certificateId)
      .catch((error: unknown) => {
        if (cancelled) return;
        setDiscount(0);
        setPromoMessage(getWidgetApiErrorDetail(error));
      });

    return () => {
      cancelled = true;
    };
  }, [applyPromo, state.certificateId, state.phase, state.promoCode, verdict]);

  const checkPromo = useCallback(
    async (code: string, certificateId: string) => {
      setChecking("promo");
      setPayError(null);
      try {
        await applyPromo(code, certificateId);
      } catch (error) {
        setVerdict(null);
        setDiscount(0);
        setPromoMessage(getWidgetApiErrorDetail(error));
      } finally {
        setChecking(null);
      }
    },
    [applyPromo]
  );

  const continuePick = useCallback(
    async (draft: {
      certificateId: string;
      count: number;
      recipientName: string;
      promoCode: string;
      email: string;
    }) => {
      setPayError(null);
      const code = draft.promoCode.trim();
      if (code) {
        const known = samePromo(verdict, code, draft.certificateId)
          ? verdict
          : null;
        if (!known) {
          setChecking("continue");
          try {
            await applyPromo(code, draft.certificateId);
          } catch (error) {
            setPromoMessage(getWidgetApiErrorDetail(error));
            return;
          } finally {
            setChecking(null);
          }
        }
      } else {
        setVerdict(null);
        setDiscount(0);
        setPromoMessage(null);
      }
      onChange({
        certificateId: draft.certificateId,
        count: draft.count,
        recipientName: draft.recipientName,
        promoCode: code,
        email: draft.email.trim(),
      });
      onPickContinue();
    },
    [applyPromo, onChange, onPickContinue, verdict]
  );

  const pay = useCallback(
    async (buyer: CertificateBuyerValues) => {
      if (!selected) return;
      setSubmitting(true);
      setPayError(null);
      try {
        const code = state.promoCode.trim();
        const accepted =
          samePromo(verdict, code, selected.id) && verdict.message == null
            ? code
            : undefined;

        const response = await saveCertificatePurchase({
          name: `${buyer.firstName} ${buyer.lastName}`.trim(),
          phone: toApiPhone(buyer.phone),
          email: state.email.trim(),
          recipientName: state.recipientName.trim(),
          messenger: buyer.messenger || null,
          promoCode: accepted,
          certificates: [
            {
              id: selected.id,
              count: clampCertificateCount(state.count),
            },
          ],
        });
        const link =
          typeof response.paymentLink === "string"
            ? response.paymentLink.trim()
            : "";
        if (!link) {
          setPayError("Не получили ссылку на оплату");
          return;
        }
        window.location.assign(link);
      } catch (error) {
        setPayError(getWidgetApiErrorDetail(error));
      } finally {
        setSubmitting(false);
      }
    },
    [selected, state.count, state.email, state.promoCode, state.recipientName, verdict]
  );

  if (state.phase === "buyer" && selected) {
    return (
      <StepCertificateBuyer
        key={restoreKey}
        certificate={selected}
        draft={{
          certificateId: selected.id,
          count: clampCertificateCount(state.count),
          recipientName: state.recipientName,
          promoCode: state.promoCode.trim(),
          email: state.email,
        }}
        discountPercent={state.promoCode.trim() ? discount : 0}
        initialBuyer={state}
        promoMessage={promoMessage}
        payError={payError}
        busy={checking != null}
        submitting={submitting}
        onBuyerChange={onChange}
        onPay={(buyer) => {
          void pay(buyer);
        }}
      />
    );
  }

  if (
    certificates.length === 0 &&
    (catalogStatus === "idle" || catalogStatus === "loading")
  ) {
    return <BookingLoader label="Загружаем сертификаты…" />;
  }

  if (certificates.length === 0 && catalogStatus === "error") {
    return (
      <BootstrapError
        error={catalogError}
        onRetry={() => onRetryCatalog?.()}
      />
    );
  }

  if (certificates.length === 0) {
    return (
      <p className="booking-certificate__empty">
        Подарочные сертификаты сейчас недоступны для покупки онлайн.
      </p>
    );
  }

  return (
    <StepCertificate
      key={restoreKey}
      certificates={certificates}
      tenantId={tenantId}
      initial={state}
      promoMessage={promoMessage}
      promoDiscount={
        samePromo(verdict, state.promoCode.trim(), state.certificateId) &&
        verdict.message == null
          ? verdict.discount
          : null
      }
      busy={checking != null}
      checking={checking}
      onCheckPromo={(code, certificateId) => {
        void checkPromo(code, certificateId);
      }}
      onValuesChange={(values) => {
        const codeChanged = values.promoCode.trim() !== state.promoCode.trim();
        const certificateChanged = values.certificateId !== state.certificateId;
        if (codeChanged || certificateChanged) {
          setPromoMessage(null);
          setVerdict(null);
          setDiscount(null);
        }
        onChange(values);
      }}
      onContinue={(draft) => {
        void continuePick(draft);
      }}
    />
  );
};
