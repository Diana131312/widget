import React from "react";
import type { BookingCategoryId } from "../types";
import {
  BookingPriceBreakdown,
  type BreakdownProductLine,
} from "../ui/BookingPriceBreakdown";

type Props = {
  categoryId: BookingCategoryId;
  roomName: string;
  guestCount: number;
  basePrice: number;
  productLines: BreakdownProductLine[];
  total: number;
  banyaDate: string | null;
  banyaTimeFrom: string | null;
  banyaTimeTo: string | null;
  checkIn: string | null;
  checkOut: string | null;
};

/** Тот же блок расчёта, что на setup. */
export const CheckoutSummary: React.FC<Props> = (props) => (
  <BookingPriceBreakdown
    className="booking-checkout-summary"
    heading="Подробный расчёт"
    {...props}
  />
);
