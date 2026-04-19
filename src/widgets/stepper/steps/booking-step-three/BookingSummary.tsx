import React from "react";
import type { BookingDraft } from "../../types";
import { Button } from "../../../../components/ui/button";
import { cn } from "../../../../lib/utils";
import { BookingContactFields } from "./BookingContactFields";
import { BookingPriceBreakdown, type PriceLineItem } from "./BookingPriceBreakdown";
import { isRuPhoneComplete } from "./utils";

type Props = {
  draft: BookingDraft;
  productLines: PriceLineItem[];
  productsSubtotal: number;
  total: number;
  fullName: string;
  phoneDisplay: string;
  comment: string;
  onFullNameChange: (v: string) => void;
  onPhoneChange: (rawInput: string) => void;
  onCommentChange: (v: string) => void;
  onSubmit?: () => void;
  canSubmit?: boolean;
  /** Текст на кнопке отправки */
  submitLabel?: string;
  className?: string;
};

export const BookingSummary: React.FC<Props> = ({
  draft,
  productLines,
  productsSubtotal,
  total,
  fullName,
  phoneDisplay,
  comment,
  onFullNameChange,
  onPhoneChange,
  onCommentChange,
  onSubmit,
  canSubmit = true,
  submitLabel = "Оформить бронирование",
  className,
}) => {
  const phoneOk = isRuPhoneComplete(phoneDisplay);
  const nameOk = fullName.trim().length >= 2;
  const formValid = nameOk && phoneOk;

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-white", className)}>
      <h3 className="sr-only">Контакты и калькуляция бронирования</h3>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-3 pb-2 pt-2 md:grid md:min-h-0 md:grid-cols-2 md:gap-6 md:px-4 md:pb-3 md:pt-3">
        <BookingContactFields
          fullName={fullName}
          phoneDisplay={phoneDisplay}
          comment={comment}
          onFullNameChange={onFullNameChange}
          onPhoneChange={onPhoneChange}
          onCommentChange={onCommentChange}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 md:border-l md:border-slate-200 md:pl-4">
          <BookingPriceBreakdown
            draft={draft}
            productLines={productLines}
            productsSubtotal={productsSubtotal}
            total={total}
          />

          {onSubmit ? (
            <Button
              type="button"
              className="mt-auto h-10 w-full shrink-0 rounded-lg text-sm md:mt-0"
              disabled={!canSubmit || !formValid}
              onClick={onSubmit}
            >
              {submitLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
