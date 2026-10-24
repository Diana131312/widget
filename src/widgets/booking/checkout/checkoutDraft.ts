export type VerifyChannel = "telegram" | "max" | "call";

export type PaymentMode = "prepay" | "full";

export type CheckoutContactDraft = {
  firstName: string;
  lastName: string;
  phone: string;
  comment: string;
  verifyChannel: VerifyChannel;
  /** Выбран на оформлении; verify создаёт бронь с этим режимом. */
  paymentMode?: PaymentMode;
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
