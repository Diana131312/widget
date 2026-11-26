export type CertificateInvoiceOrder = {
  id: string;
  scope: "booking" | "order";
  timeoutMinutes: number | null;
};

function readText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function firstText(value: unknown): string {
  const direct = readText(value);
  if (direct) return direct;
  if (!Array.isArray(value)) return "";
  for (const item of value) {
    const text = readText(item);
    if (text) return text;
  }
  return "";
}

/** Номер заказа из ответа /save-certificates. */
export function readCertificateInvoiceOrder(
  response: unknown
): CertificateInvoiceOrder | null {
  const root = asRecord(response);
  if (!root) return null;
  const record = asRecord(root.data) ?? asRecord(root.result) ?? root;
  const orderId =
    firstText(record.orderId) ||
    firstText(record.orderIds) ||
    firstText(record.certificateOrderId);
  const bookingId = firstText(record.bookingId) || firstText(record.bookingIds);
  const id = orderId || bookingId || firstText(record.id);
  if (!id) return null;
  const minutes = record.timeoutMinutes ?? root.timeoutMinutes;
  return {
    id,
    scope: orderId ? "order" : "booking",
    timeoutMinutes: typeof minutes === "number" && minutes > 0 ? minutes : null,
  };
}
