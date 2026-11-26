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

export type BookingPromoCheck = {
  discount: number;
  reason: string;
  dateFrom: string | null;
  dateTo: string | null;
  horizonDays: number | null;
};

function formatPromoDate(raw: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) return raw;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

export function parseBookingPromo(raw: unknown): BookingPromoCheck {
  const record = readRecord(raw) ?? {};
  const discount = readAmount(record.discount) ?? 0;
  const horizon = readAmount(record.horizonDays);
  return {
    discount,
    reason: readText(record.reason) ?? (discount > 0 ? "ok" : "not_found"),
    dateFrom: readText(record.dateFrom),
    dateTo: readText(record.dateTo),
    horizonDays: horizon,
  };
}

/** Текст, если код не подходит к бане или дому. */
export function bookingPromoMessage(result: BookingPromoCheck): string {
  switch (result.reason) {
    case "not_found":
      return "Такого промокода нет или он выключен";
    case "wrong_date": {
      const from = result.dateFrom ? `с ${formatPromoDate(result.dateFrom)}` : "";
      const to = result.dateTo ? `по ${formatPromoDate(result.dateTo)}` : "";
      const range = [from, to].filter(Boolean).join(" ");
      return range ? `Промокод действует ${range}` : "Промокод сейчас не действует";
    }
    case "wrong_day":
      return "Промокод не действует в этот день недели";
    case "wrong_room":
      return "Промокод не действует на выбранную баню или дом";
    case "wrong_horizon":
      return result.horizonDays != null
        ? `Промокод можно применить за ${result.horizonDays} дн. до визита`
        : "Промокод пока нельзя применить к этой дате";
    default:
      return "Промокод не подходит";
  }
}

/**
 * POST /promo-code/check.
 * Для общего зала вместо roomId уходит commonRoomId.
 */
export async function checkBookingPromo(args: {
  promoCode: string;
  roomId: string;
  date: string;
  commonRoom?: boolean;
}): Promise<BookingPromoCheck> {
  const body = args.commonRoom
    ? {
        commonRoomId: args.roomId,
        promoCodeName: args.promoCode,
        date: args.date,
      }
    : {
        roomId: args.roomId,
        promoCodeName: args.promoCode,
        date: args.date,
      };
  return parseBookingPromo(await postWidget("/promo-code/check", body));
}

export function certificateCoverage(
  total: number,
  balance: number
): { writeOff: number; remainingPay: number; remainingBalance: number } {
  const bill = Number.isFinite(total) ? Math.max(0, total) : 0;
  const nominal = Number.isFinite(balance) ? Math.max(0, balance) : 0;
  const writeOff = Math.min(nominal, bill);
  return {
    writeOff,
    remainingPay: bill - writeOff,
    remainingBalance: nominal - writeOff,
  };
}

/** Сколько сертификат снимает с выбранной оплаты и что остаётся в итоге. */
export function certificatePaymentPreview(
  total: number,
  prepay: number | null,
  balance: number,
  mode: "prepay" | "full"
): { writeOff: number; totalAfter: number; due: number } {
  const bill = mode === "prepay" && prepay != null ? prepay : total;
  const coverage = certificateCoverage(bill, balance);
  return {
    writeOff: coverage.writeOff,
    totalAfter: Math.max(0, total - coverage.writeOff),
    due: coverage.remainingPay,
  };
}

const rub = new Intl.NumberFormat("ru-RU");

/** «Электронный сертификат: спишется 3 000 ₽, останется 4 000 ₽». */
export function certificateApplyHint(
  name: string,
  balance: number,
  bill: number
): string {
  const { writeOff, remainingBalance } = certificateCoverage(bill, balance);
  return `${name}: спишется ${rub.format(writeOff)} ₽, останется ${rub.format(remainingBalance)} ₽`;
}

export function certificateCoverageText(total: number, balance: number): string {
  const { writeOff, remainingBalance } = certificateCoverage(total, balance);
  return `Спишется ${rub.format(writeOff)} рублей останется ${rub.format(remainingBalance)} рублей`;
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
      certificatePaidFully: true,
    };
  }
  return {
    ...meta,
    prepayment: paid.remainingAmount ?? meta.prepayment,
    paymentLink: paid.paymentLink ?? meta.paymentLink,
    paidByCertificate: true,
    certificatePaidFully: false,
  };
}

export type BookingPaymentNext =
  | { action: "redirect"; link: string; result: BookingResultDraft }
  | { action: "stay"; result: BookingResultDraft };

/**
 * После создания брони. Сертификат списывается сразу.
 * Ссылка на банк уводит гостя со шага ожидания. Счёт и полная оплата
 * сертификатом остаются в виджете.
 */
export async function settleBookingPayment(
  meta: BookingResultDraft,
  certificateNumber?: string
): Promise<BookingPaymentNext> {
  if (meta.payByInvoice) return { action: "stay", result: meta };
  const number = certificateNumber?.trim() ?? "";
  const result = number ? await applyCertificatePayment(meta, number) : meta;
  if (result.certificatePaidFully || !result.paymentLink) {
    return { action: "stay", result };
  }
  return { action: "redirect", link: result.paymentLink, result };
}

/** Переход на страницу оплаты брони. */
export function openBookingPayment(link: string): void {
  window.location.assign(link);
}
