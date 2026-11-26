import { BOOKING_ALIAS } from "../constants";
import { toApiPhone } from "./phone";

const WIDGET_API_BASE = "https://app.gettime.online/api/widget";
const PDF_ORIGIN = "https://app.gettime.online";

export type InvoiceMode = "prepay" | "full";
export type PartyType = "LEGAL" | "INDIVIDUAL";

export type InvoiceParty = {
  name: string;
  inn: string;
  kpp: string;
  address: string;
  type: PartyType | "";
};

export type InvoiceBuyer = {
  name: string;
  inn: string;
  kpp: string;
  address: string;
  email: string;
};

export type InvoiceOffer = {
  orderNumber: string;
  prepayAmount: number | null;
  fullAmount: number | null;
  paymentDays: number | null;
};

export type InvoiceDocument = {
  documentId: string;
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  buyerName: string;
  pdfUrl: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function invoicePaymentEnabled(config: { invoicePayment?: unknown }): boolean {
  return config.invoicePayment === true;
}

export function isInvoiceEmail(value: string): boolean {
  const email = value.trim();
  return email.length > 0 && email.length <= 200 && EMAIL_RE.test(email);
}

/** 2026-11-27 → 27.11.2026 */
export function formatInvoiceDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return iso;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

export function invoicePdfHref(pdfUrl: string): string {
  const url = pdfUrl.trim();
  if (/^https?:\/\//i.test(url)) return url;
  return `${PDF_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

/** null — реквизиты можно отправлять. */
export function invoiceBuyerError(buyer: InvoiceBuyer): string | null {
  const name = buyer.name.trim();
  const inn = digits(buyer.inn);
  const kpp = digits(buyer.kpp);
  const address = buyer.address.trim();
  if (!name || name.length > 300) return "Укажите наименование";
  if (inn.length !== 10 && inn.length !== 12) return "Проверьте ИНН";
  if (inn.length === 10 && kpp.length !== 9) return "Укажите КПП (9 цифр)";
  if (inn.length === 12 && kpp.length > 0 && kpp.length !== 9) {
    return "Укажите КПП (9 цифр)";
  }
  if (!address || address.length > 500) return "Укажите юридический адрес";
  if (!isInvoiceEmail(buyer.email)) return "Проверьте e-mail";
  return null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function errorText(body: unknown): string | null {
  if (typeof body === "string") {
    const text = body.trim();
    if (!text || text.startsWith("{") || text.startsWith("[")) return null;
    return text;
  }
  const record = readRecord(body);
  if (!record) return null;
  for (const key of ["message", "Message", "error", "Error", "title", "detail"]) {
    const text = readText(record[key]);
    if (text && !text.startsWith("{") && !text.startsWith("[")) return text;
  }
  return null;
}

async function requestWidget(
  method: "GET" | "POST",
  path: string,
  body?: unknown
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${WIDGET_API_BASE}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      credentials: "include",
      ...(body != null ? { body: JSON.stringify(body) } : {}),
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
    throw new Error(errorText(parsed) ?? "Не удалось выставить счёт. Попробуйте ещё раз");
  }
  return parsed;
}

export function parseInvoiceParties(raw: unknown): InvoiceParty[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const record = readRecord(item);
    if (!record) return [];
    const name = readText(record.name);
    const inn = digits(readText(record.inn));
    if (!name || !inn) return [];
    const typeRaw = readText(record.type);
    return [
      {
        name,
        inn,
        kpp: digits(readText(record.kpp)),
        address: readText(record.address),
        type: typeRaw === "LEGAL" || typeRaw === "INDIVIDUAL" ? typeRaw : "",
      },
    ];
  });
}

export function parseInvoiceOffer(raw: unknown): InvoiceOffer {
  const record = readRecord(raw) ?? {};
  return {
    orderNumber: readText(record.orderNumber),
    prepayAmount: readAmount(record.prepayAmount),
    fullAmount: readAmount(record.fullAmount),
    paymentDays: readAmount(record.paymentDays),
  };
}

export function parseInvoiceDocument(raw: unknown): InvoiceDocument {
  const record = readRecord(raw) ?? {};
  return {
    documentId: readText(record.documentId),
    number: readText(record.number),
    date: readText(record.date),
    dueDate: readText(record.dueDate),
    amount: readAmount(record.amount) ?? 0,
    buyerName: readText(record.buyerName),
    pdfUrl: readText(record.pdfUrl),
  };
}

export async function suggestInvoiceParties(query: string): Promise<InvoiceParty[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const raw = await requestWidget(
    "GET",
    `/invoice/suggest/${BOOKING_ALIAS}?query=${encodeURIComponent(q)}`
  );
  return parseInvoiceParties(raw);
}

export type InvoiceScope = "booking" | "daily" | "order";

function invoiceIdBody(args: {
  bookingId: string;
  daily: boolean;
  scope?: InvoiceScope;
}): { bookingIds: string[] } | { dailyBookingIds: string[] } | { orderIds: string[] } {
  const scope = args.scope ?? (args.daily ? "daily" : "booking");
  if (scope === "order") return { orderIds: [args.bookingId] };
  if (scope === "daily") return { dailyBookingIds: [args.bookingId] };
  return { bookingIds: [args.bookingId] };
}

export async function offerInvoice(args: {
  bookingId: string;
  daily: boolean;
  scope?: InvoiceScope;
  phone: string;
}): Promise<InvoiceOffer> {
  const phone = toApiPhone(args.phone);
  const raw = await requestWidget("POST", "/invoice/offer", {
    alias: BOOKING_ALIAS,
    ...invoiceIdBody(args),
    phone,
  });
  return parseInvoiceOffer(raw);
}

export async function createInvoice(args: {
  bookingId: string;
  daily: boolean;
  scope?: InvoiceScope;
  phone: string;
  mode: InvoiceMode;
  buyer: InvoiceBuyer;
}): Promise<InvoiceDocument> {
  const inn = digits(args.buyer.inn);
  const kpp = digits(args.buyer.kpp);
  const phone = toApiPhone(args.phone);
  const raw = await requestWidget("POST", "/invoice/create", {
    alias: BOOKING_ALIAS,
    ...invoiceIdBody(args),
    phone,
    mode: args.mode,
    buyer: {
      name: args.buyer.name.trim(),
      inn,
      ...(inn.length === 10 || kpp ? { kpp } : {}),
      address: args.buyer.address.trim(),
      email: args.buyer.email.trim(),
    },
  });
  return parseInvoiceDocument(raw);
}

/** Сначала offer, затем счёт на всю сумму, если сервер её разрешил. */
export async function issueInvoice(args: {
  bookingId: string;
  daily: boolean;
  scope?: InvoiceScope;
  phone: string;
  buyer: InvoiceBuyer;
}): Promise<InvoiceDocument> {
  const offer = await offerInvoice(args);
  return createInvoice({
    ...args,
    mode: offer.fullAmount != null ? "full" : "prepay",
  });
}
