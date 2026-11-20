import React, { useCallback, useEffect, useState } from "react";
import { toApiPhone } from "../checkout/phone";
import { getWidgetApiErrorDetail } from "../ui/errorMessages";
import { BookingLoader } from "../ui/BookingLoader";
import { BootstrapError } from "../ui/BootstrapError";
import {
  checkCertificatePromo,
  promoAppliesTo,
  rejectPromoMessage,
  certificatePurchaseOutcome,
  openCertificatePayment,
  saveCertificatePurchase,
} from "./certificateApi";
import type { CertificateBuyerValues } from "./StepCertificateBuyer";
import type { CertificateUrlState } from "./certificateUrl";
import { PAPER_CERTIFICATE_EMAIL } from "./certificateFormat";
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

function selectionKey(ids: string[]): string {
  return [...new Set(ids)].sort().join(",");
}

function selectedIds(state: CertificateUrlState): string[] {
  const fromLines = (state.lines ?? [])
    .filter((line) => line.id && line.count >= 1)
    .map((line) => line.id);
  if (fromLines.length > 0) return fromLines;
  return state.certificateId ? [state.certificateId] : [];
}

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
  const [orderPaid, setOrderPaid] = useState(false);
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

  const applyPromo = useCallback(async (code: string, certificateIds: string[]) => {
    const certificateId = selectionKey(certificateIds);
    const result = await checkCertificatePromo({
      promoCode: code,
      certificateTypeIds: certificateIds,
    });
    const covered = certificateIds.some((id) => promoAppliesTo(result, id));
    const next: PromoVerdict = covered
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
          message: rejectPromoMessage(result, certificateIds[0] ?? ""),
        };
    setVerdict(next);
    setDiscount(next.discount);
    setPromoMessage(next.message);
    return next;
  }, []);

  useEffect(() => {
    const ids = selectedIds(state);
    if (state.phase !== "buyer" || ids.length === 0) return;
    const code = state.promoCode.trim();
    if (!code) {
      setDiscount(0);
      setPromoMessage(null);
      return;
    }
    if (samePromo(verdict, code, selectionKey(ids))) {
      setDiscount(verdict.discount);
      setPromoMessage(verdict.message);
      return;
    }

    let cancelled = false;
    void applyPromo(code, ids)
      .catch((error: unknown) => {
        if (cancelled) return;
        setDiscount(0);
        setPromoMessage(getWidgetApiErrorDetail(error));
      });

    return () => {
      cancelled = true;
    };
  }, [applyPromo, state, verdict]);

  const checkPromo = useCallback(
    async (code: string, certificateIds: string[]) => {
      setChecking("promo");
      setPayError(null);
      try {
        await applyPromo(code, certificateIds);
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
      lines: { id: string; count: number }[];
    }) => {
      setPayError(null);
      const code = draft.promoCode.trim();
      const ids = draft.lines.map((line) => line.id);
      if (code) {
        const known = samePromo(verdict, code, selectionKey(ids))
          ? verdict
          : null;
        if (!known) {
          setChecking("continue");
          try {
            await applyPromo(code, ids);
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
        lines: draft.lines,
        recipientName: draft.recipientName,
        promoCode: code,
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
        const ids = selectedIds(state);
        const accepted =
          samePromo(verdict, code, selectionKey(ids)) && verdict.message == null
            ? code
            : undefined;

        const paper = state.format === "paper";
        const response = await saveCertificatePurchase({
          name: `${buyer.firstName} ${buyer.lastName}`.trim(),
          phone: toApiPhone(buyer.phone),
          email: paper
            ? PAPER_CERTIFICATE_EMAIL
            : state.format === "electronic"
              ? state.email.trim()
              : buyer.email.trim(),
          recipientName: "",
          messenger: "telegram",
          promoCode: accepted,
          certificates: (state.lines && state.lines.length > 0
            ? state.lines
            : [{ id: selected.id, count: state.count }]
          ).map((line) => ({
            id: line.id,
            count: clampCertificateCount(line.count),
          })),
        });
        const outcome = certificatePurchaseOutcome(response);
        if (outcome === "paid") {
          setOrderPaid(true);
          return;
        }
        const link =
          typeof response.paymentLink === "string"
            ? response.paymentLink.trim()
            : "";
        if (outcome === "missing-link" || !link) {
          setPayError("Не получили ссылку на оплату");
          return;
        }
        openCertificatePayment(link);
      } catch (error) {
        setPayError(getWidgetApiErrorDetail(error));
      } finally {
        setSubmitting(false);
      }
    },
    [selected, state, verdict]
  );

  if (orderPaid && state.phase === "buyer") {
    return (
      <div className="booking-checkout booking-checkout--success">
        <p className="booking-checkout__success-title">Заказ оплачен</p>
      </div>
    );
  }

  if (state.phase === "buyer" && selected) {
    return (
      <StepCertificateBuyer
        key={restoreKey}
        certificate={selected}
        items={selectedIds(state)
          .map((id) => {
            const item = certificates.find((certificate) => certificate.id === id);
            const count =
              state.lines?.find((line) => line.id === id)?.count ?? state.count;
            return item ? { certificate: item, count: clampCertificateCount(count) } : null;
          })
          .filter((row): row is { certificate: SaleCertificate; count: number } => row != null)}
        draft={{
          certificateId: selected.id,
          count: clampCertificateCount(state.count),
          recipientName: state.recipientName,
          promoCode: state.promoCode.trim(),
          lines:
            state.lines && state.lines.length > 0
              ? state.lines
              : [{ id: selected.id, count: clampCertificateCount(state.count) }],
        }}
        discountPercent={state.promoCode.trim() ? discount : 0}
        initialBuyer={state}
        showEmail={state.format == null}
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
