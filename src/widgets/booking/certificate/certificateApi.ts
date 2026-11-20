import { createWidgetApi, type WidgetMessenger } from "../../../api";
import { BOOKING_ALIAS } from "../constants";

const WIDGET_API_BASE = "https://app.gettime.online/api/widget";

export type CertificatePromoResult = {
  discount: number;
  reason: string;
  certificateTypeIds: string[];
  dateFrom: string | null;
  dateTo: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isCertificateEmail(value: string): boolean {
  const email = value.trim();
  return email.length <= 200 && EMAIL_RE.test(email);
}

export function promoAppliesTo(
  result: CertificatePromoResult,
  certificateId: string
): boolean {
  return result.discount > 0 && result.certificateTypeIds.includes(certificateId);
}

/** null — промокод можно передавать в покупку. */
export function rejectPromoMessage(
  result: CertificatePromoResult,
  certificateId: string
): string | null {
  if (promoAppliesTo(result, certificateId)) return null;
  if (result.reason === "ok") {
    return certificatePromoMessage({ ...result, reason: "wrong_certificate" });
  }
  return certificatePromoMessage(result);
}

function formatPromoDate(raw: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) return raw;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

export function certificatePromoMessage(result: CertificatePromoResult): string {
  switch (result.reason) {
    case "not_found":
      return "Такого промокода нет или он выключен";
    case "wrong_date": {
      const from = result.dateFrom ? `с ${formatPromoDate(result.dateFrom)}` : "";
      const to = result.dateTo ? `по ${formatPromoDate(result.dateTo)}` : "";
      const range = [from, to].filter(Boolean).join(" ");
      return range
        ? `Промокод действует ${range}`
        : "Промокод сейчас не действует";
    }
    case "wrong_day":
      return "Промокод не действует в этот день недели";
    case "wrong_certificate":
      return "Промокод не действует на выбранный сертификат";
    default:
      return "Промокод не подходит";
  }
}

export function parseCertificatePromo(raw: unknown): CertificatePromoResult {
  const record =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const discount = Number(record.discount);
  const ids = Array.isArray(record.certificateTypeIds)
    ? record.certificateTypeIds.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0
      )
    : [];
  return {
    discount: Number.isFinite(discount) ? discount : 0,
    reason: typeof record.reason === "string" ? record.reason : "not_found",
    certificateTypeIds: ids,
    dateFrom: typeof record.dateFrom === "string" ? record.dateFrom : null,
    dateTo: typeof record.dateTo === "string" ? record.dateTo : null,
  };
}

function failed(status: number, statusText: string, body: unknown): Error {
  const error = new Error(
    `Widget API request failed: ${status} ${statusText}`
  ) as Error & { status: number; body: unknown };
  error.status = status;
  error.body = body;
  return error;
}

/** POST /promo-code/check-certificates */
export async function checkCertificatePromo(args: {
  promoCode: string;
  certificateTypeIds: string[];
  alias?: string;
  fetcher?: typeof fetch;
}): Promise<CertificatePromoResult> {
  const fetcher = args.fetcher ?? fetch;
  const url = `${WIDGET_API_BASE}/promo-code/check-certificates`;
  const res = await fetcher(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      alias: args.alias ?? BOOKING_ALIAS,
      promoCode: args.promoCode,
      certificateTypeIds: args.certificateTypeIds,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw failed(res.status, res.statusText, data);
  return parseCertificatePromo(data);
}

export type SaveCertificatePurchaseArgs = {
  name: string;
  phone: string;
  email: string;
  recipientName: string;
  messenger: WidgetMessenger;
  certificates: { id: string; count: number }[];
  promoCode?: string;
  alias?: string;
  fetcher?: typeof fetch;
};

export type CertificatePurchaseResult = {
  amount?: number;
  paymentLink?: string | null;
  paid?: boolean;
};

/** Куда вести после /save-certificates. */
export function certificatePurchaseOutcome(
  response: CertificatePurchaseResult
): "redirect" | "paid" | "missing-link" {
  const link =
    typeof response.paymentLink === "string" ? response.paymentLink.trim() : "";
  if (link) return "redirect";
  if (response.paid === true) return "paid";
  return "missing-link";
}

export function openCertificatePayment(link: string): void {
  window.location.assign(link);
}

/** POST /save-certificates. Промокод передаём только если проверка его приняла. */
export async function saveCertificatePurchase(args: SaveCertificatePurchaseArgs) {
  const api = createWidgetApi({
    alias: args.alias ?? BOOKING_ALIAS,
    fetcher: args.fetcher,
  });
  return api.saveCertificates({
    name: args.name,
    phone: args.phone,
    email: args.email,
    recipientName: args.recipientName,
    messenger: args.messenger,
    certificates: args.certificates,
    ...(args.promoCode ? { promoCode: args.promoCode } : {}),
  });
}
