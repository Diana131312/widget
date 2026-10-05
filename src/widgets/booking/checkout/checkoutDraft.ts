export type VerifyChannel = "telegram" | "max" | "call";

export type CheckoutContactDraft = {
  firstName: string;
  lastName: string;
  phone: string;
  comment: string;
  verifyChannel: VerifyChannel;
};

export type BookingResultDraft = {
  bookingId: string;
  price: number | null;
  prepayment: number;
  paymentLink: string | null;
  timeoutMinutes: number | null;
  message: string;
  /** Итого с товарами (для fallback отображения) */
  totalFallback: number;
};

/** Мета /calculate, сохраняем для шага 4. */
export type BookingCalcMeta = {
  prepay: number | null;
  prepayIncludesProducts: boolean | null;
  extraValueForDate: number | null;
};
