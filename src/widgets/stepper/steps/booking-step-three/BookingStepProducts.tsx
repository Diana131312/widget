import React from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import type { StepProps } from "../stepTypes";
import { ProductGroupAccordion } from "./ProductGroupAccordion";
import { useBookingCatalog } from "./useBookingCatalog";

function formatBookingDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMMM yyyy", { locale: ru });
  } catch {
    return dateStr;
  }
}

export const BookingStepProducts: React.FC<StepProps> = ({ state, goTo }) => {
  const {
    draft,
    config,
    patchDraft,
    setProductQty,
    groupedForRoom,
    quantities,
    productsSubtotal,
    total,
  } = useBookingCatalog(state);

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

  if (!config) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
      </div>
    );
  }

  const base = draft.basePrice;
  const selectedRoom = config.rooms.find((r) => r.id === draft.roomId);
  const maxGuests = selectedRoom?.maxCapacity ?? selectedRoom?.capacity ?? 10;
  const guestCount = Math.max(1, Math.min(draft.guestCount || 1, maxGuests));

  const setGuestCount = (next: number) => {
    const clamped = Math.max(1, Math.min(next, maxGuests));
    patchDraft({ guestCount: clamped });
  };

  return (
    <div className="booking-step-three relative flex min-h-0 w-full flex-1 flex-col">
      <div className="booking-step-three__scroll-main space-y-8 px-1 pb-3 pt-1 sm:space-y-10 sm:px-0 sm:pb-5 sm:pt-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Количество гостей</div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setGuestCount(guestCount - 1)}
              disabled={guestCount <= 1}
              aria-label="Уменьшить количество гостей"
            >
              −
            </Button>
            <Badge variant="secondary" className="min-w-10 justify-center">
              {guestCount}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setGuestCount(guestCount + 1)}
              disabled={guestCount >= maxGuests}
              aria-label="Увеличить количество гостей"
            >
              +
            </Button>
            <span className="text-xs text-slate-500">макс. {maxGuests}</span>
          </div>
        </div>

        <div className="mt-8 sm:mt-10">
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:mb-5">
            Каталог
          </h4>
          {groupedForRoom.groups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-[#FAFAF8] px-6 py-10 text-center text-sm text-gray-600 sm:py-12">
              Для этой бани нет доступных дополнительных товаров в каталоге.
            </div>
          ) : (
            <ProductGroupAccordion
              groups={groupedForRoom.groups}
              quantities={quantities}
              onSetQuantity={setProductQty}
              tenantId={config.settings.tenantId}
            />
          )}
        </div>
      </div>

      <div className="booking-step-three__footer space-y-4 pt-5">
        <div className="space-y-1.5 text-sm text-[#485548]">
          <div className="flex justify-between gap-3">
            <span>Стоимость бани</span>
            <span className="shrink-0 tabular-nums font-medium">{base.toLocaleString("ru-RU")} ₽</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Доп. товары</span>
            <span className="shrink-0 tabular-nums font-medium">
              {productsSubtotal.toLocaleString("ru-RU")} ₽
            </span>
          </div>
          <div className="border-t border-gray-200 pt-2" />
          <div className="flex justify-between gap-3 text-base font-semibold">
            <span>Итого</span>
            <span className="tabular-nums">{total.toLocaleString("ru-RU")} ₽</span>
          </div>
        </div>
        <Button
          type="button"
          className="h-11 w-full rounded-xl bg-[#485548] text-sm font-medium text-white hover:bg-[#485548]/90"
          onClick={() => goTo("bookingStepFour")}
        >
          Далее
        </Button>
      </div>
    </div>
  );
};
