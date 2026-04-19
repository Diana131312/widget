import React from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "../../../../components/ui/button";
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

export const BookingStepProducts: React.FC<StepProps> = ({ state, setState, goTo }) => {
  const {
    draft,
    config,
    setProductQty,
    groupedForRoom,
    quantities,
    productsSubtotal,
    total,
  } = useBookingCatalog(state, setState);

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

  return (
    <div className="booking-step-three relative flex min-h-0 w-full flex-1 flex-col">
      <div className="booking-step-three__scroll-main">
        <div className="pr-1">
          <h3 className="text-lg font-semibold tracking-tight text-[#485548] sm:text-xl">
            Дополнительные товары
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Выберите опции к бронированию на {formatBookingDate(draft.date)}. Группы по умолчанию свернуты.
          </p>
        </div>

        <div className="mt-5">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Каталог</h4>
          {groupedForRoom.groups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-[#FAFAF8] p-8 text-center text-sm text-gray-600">
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

      <div className="booking-step-three__footer space-y-3">
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
