export type VerifyChannel = "telegram" | "max" | "call";

export type PaymentMode = "prepay" | "full";

/** Третий пункт на оформлении: бронь всё равно уходит с полной оплатой. */
export type PayChoice = PaymentMode | "invoice";

export type CheckoutContactDraft = {
  firstName: string;
  lastName: string;
  phone: string;
  comment: string;
  verifyChannel: VerifyChannel;
  /** Выбран на оформлении; verify создаёт бронь с этим режимом. */
  paymentMode?: PaymentMode;
  /** Проверенный промокод. Пусто — в бронь не отправляем. */
  promoCode?: string;
  /** Проверенный номер. Списание идёт после создания брони. */
  certificateNumber?: string;
  /** Гость платит с расчётного счёта. В /save уходит paymentMode full. */
  payByInvoice?: boolean;
  /** Куда отправить PDF счёта. */
  invoiceEmail?: string;
};

export type BookingResultDraft = {
  bookingId: string;
  price: number | null;
  /** Сумма к оплате (amount из ответа save) */
  prepayment: number;
  paymentLink: string | null;
  timeoutMinutes: number | null;
  message: string;
  /** Итого с товарами (для fallback отображения) */
  totalFallback: number;
  paymentMode?: PaymentMode | null;
  /** Момент автоотмены неоплаченной брони (мс) — переживает перезагрузку */
  expiresAtMs?: number | null;
  /** Сертификат применён к брони. */
  paidByCertificate?: boolean;
  /** Сертификат закрыл всю выбранную сумму, доплата не нужна. */
  certificatePaidFully?: boolean;
  /** Шаг 6 показывает выставление счёта, а не ссылку на оплату. */
  payByInvoice?: boolean;
  invoiceEmail?: string;
  /** true — id относится к посуточной брони. */
  invoiceDaily?: boolean;
};

/** Мета /calculate, сохраняем для шага 4–5. */
export type BookingCalcMeta = {
  prepay: number | null;
  prepayIncludesProducts: boolean | null;
  extraValueForDate: number | null;
  discountAmount: number | null;
  discountText: string | null;
  amountBeforeDiscount: number | null;
};

/** Помечает результат брони, если гость выбрал оплату по счёту. */
export function withInvoiceIntent(
  result: BookingResultDraft,
  contact: CheckoutContactDraft,
  categoryId: "banya" | "homes"
): BookingResultDraft {
  if (!contact.payByInvoice) return result;
  return {
    ...result,
    payByInvoice: true,
    invoiceEmail: contact.invoiceEmail?.trim() ?? "",
    invoiceDaily: categoryId === "homes",
    paymentMode: "full",
  };
}
