import React from "react";
import { Button } from "../../../../components/ui/button";
import type { StepProps } from "../stepTypes";
import { BookingContactFields } from "./BookingContactFields";
import { CheckoutPlainSummary } from "./CheckoutPlainSummary";
import { formatRuPhoneMask, isRuPhoneComplete } from "./utils";
import { useBookingCatalog } from "./useBookingCatalog";

export const BookingStepCheckout: React.FC<StepProps> = ({
  state,
  setState,
  goTo,
  onShowToast,
}) => {
  const { draft, patchDraft, productsSubtotal, total } = useBookingCatalog(state, setState);

  const handlePhoneChange = (raw: string) => {
    patchDraft({ contactPhone: formatRuPhoneMask(raw) });
  };

  const handleSubmit = () => {
    if (!draft) return;
    onShowToast?.(
      `Заявка (демо): ${draft.roomName}, ${draft.date}, ${draft.guestCount} гостей, итого ${total.toLocaleString("ru-RU")} ₽`
    );
  };

  if (!draft) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm text-amber-900">Сначала выберите баню, дату и время слота.</p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => goTo("banyaObject")}>
          Вернуться к выбору
        </Button>
      </div>
    );
  }

  const fullName = draft.contactFullName ?? "";
  const phoneDisplay = draft.contactPhone ?? "";
  const comment = draft.comment ?? "";
  const phoneOk = isRuPhoneComplete(phoneDisplay);
  const nameOk = fullName.trim().length >= 2;
  const formValid = nameOk && phoneOk;

  return (
    <div className="booking-step-three relative flex min-h-0 w-full flex-1 flex-col">
      <div className="booking-step-three__scroll-main">
        <h3 className="text-lg font-semibold tracking-tight text-[#485548] sm:text-xl">Оформление заказа</h3>
        <p className="mt-1 text-sm text-gray-600">
          Заполните контакты и проверьте детали бронирования перед оплатой.
        </p>

        <div className="mt-8 flex flex-col gap-0">
          <BookingContactFields
            variant="plain"
            fullName={fullName}
            phoneDisplay={phoneDisplay}
            comment={comment}
            onFullNameChange={(v) => patchDraft({ contactFullName: v })}
            onPhoneChange={handlePhoneChange}
            onCommentChange={(v) => patchDraft({ comment: v })}
          />
        </div>

        <div className="mt-10">
          <CheckoutPlainSummary draft={draft} productsSubtotal={productsSubtotal} total={total} />
        </div>

        <div className="mt-10 pb-1">
          <Button
            type="button"
            className="h-11 w-full rounded-xl bg-[#485548] text-sm font-medium text-white hover:bg-[#485548]/90 disabled:opacity-50"
            disabled={!formValid}
            onClick={handleSubmit}
          >
            Оформить заказ
          </Button>
        </div>
      </div>
    </div>
  );
};
