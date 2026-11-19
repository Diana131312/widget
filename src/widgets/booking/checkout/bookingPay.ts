import { createWidgetApi } from "../../../api";
import { BOOKING_ALIAS } from "../constants";
import type { BookingResultDraft } from "./checkoutDraft";

const WIDGET_API_BASE = "https://app.gettime.online/api/widget";

export type CheckedCertificate = {
  name: string;
  balance: number;
};

export type CertificatePayment = {
  paidFully: boolean;
  certificateUsed: number;
  remainingAmount: number | null;
  paymentLink: string | null;
};

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text : null;
}

function readAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function errorText(body: unknown): string | null {
  const direct = readText(body);
  if (direct && !direct.startsWith("{") && !direct.startsWith("[")) return direct;
  const record = readRecord(body);
  if (!record) return null;
  for (const key of ["message", "Message", "error", "Error", "title", "detail"]) {
    const text = readText(record[key]);
    if (!text) continue;
    if (text.startsWith("{") || text.startsWith("[")) {
      try {
        return errorText(JSON.parse(text));
      } catch {
        return null;
      }
    }
    return text;
  }
  return null;
}

async function postWidget(path: string, body: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${WIDGET_API_BASE}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Проверьте интернет и попробуйте ещё раз");
  }

  const raw = await response.text();
  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
  }

  if (!response.ok) {
    throw new Error(
      errorText(parsed) ?? "Не удалось проверить данные. Попробуйте ещё раз"
    );
  }
  return parsed;
}

/** POST /promo-code/check — процент скидки, 0 если код не действует. */
export async function checkBookingPromo(promoCode: string): Promise<number> {
  const api = createWidgetApi({ alias: BOOKING_ALIAS });
  const raw = await api.checkPromoCode({
    alias: BOOKING_ALIAS,
    promoCode,
  });
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : 0;
}

/** POST /check-certificate — название и остаток. Ошибка 400 приходит текстом. */
export async function checkBookingCertificate(
  certificateNumber: string
): Promise<CheckedCertificate> {
  const data = readRecord(
    await postWidget("/check-certificate", {
      alias: BOOKING_ALIAS,
      certificateNumber,
    })
  );
  const name =
    readText(data?.name) ??
    readText(data?.title) ??
    readText(data?.certificateName) ??
    "Сертификат";
  const balance = readAmount(data?.balance) ?? 0;
  return { name, balance };
}

/** POST /pay-with-certificate — списывает предоплату уже созданной брони. */
export async function payBookingWithCertificate(args: {
  bookingId: string;
  certificateNumber: string;
}): Promise<CertificatePayment> {
  const data = readRecord(
    await postWidget("/pay-with-certificate", {
      alias: BOOKING_ALIAS,
      bookingId: args.bookingId,
      certificateNumber: args.certificateNumber,
    })
  );
  const paidFully = data?.paidFully === true;
  const certificateUsed = readAmount(data?.certificateUsed) ?? 0;
  const remainingAmount = readAmount(data?.remainingAmount);
  const paymentLink = readText(data?.paymentLink);
  return { paidFully, certificateUsed, remainingAmount, paymentLink };
}

/**
 * Бронь уже создана. Сертификат гасит предоплату.
 * Если суммы не хватило — подменяет ссылку и остаток к доплате.
 * Если списание не прошло — оставляет оплату картой из ответа save.
 */
export async function applyCertificatePayment(
  meta: BookingResultDraft,
  certificateNumber: string
): Promise<BookingResultDraft> {
  const number = certificateNumber.trim();
  if (!number || !meta.bookingId) return meta;
  const paid = await payBookingWithCertificate({
    bookingId: meta.bookingId,
    certificateNumber: number,
  });
  if (paid.paidFully) {
    return {
      ...meta,
      prepayment: 0,
      paymentLink: null,
      paidByCertificate: true,
    };
  }
  return {
    ...meta,
    prepayment: paid.remainingAmount ?? meta.prepayment,
    paymentLink: paid.paymentLink ?? meta.paymentLink,
    paidByCertificate: true,
  };
}
