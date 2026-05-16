import React from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import type { BookingFlowDraft, CategoryId } from "../../types";
import type { PriceLineItem } from "./BookingPriceBreakdown";
import type { BanyaCalculateView, HomesCalculateView } from "./bookingCalculate.utils";

type Props = {
  categoryId: CategoryId;
  draft: BookingFlowDraft;
  banyaCalc: BanyaCalculateView | null;
  homesCalc: HomesCalculateView | null;
  productLines: PriceLineItem[];
  productsSubtotal: number;
  total: number;
  isLoading: boolean;
  error: string | null;
};

function formatNightDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMM", { locale: ru });
  } catch {
    return dateStr;
  }
}

export const SetupPriceBreakdown: React.FC<Props> = ({
  categoryId,
  draft,
  banyaCalc,
  homesCalc,
  productLines,
  productsSubtotal,
  total,
  isLoading,
  error,
}) => {
  if (categoryId === "banyaTest" && (!draft.timeFrom || !draft.timeTo)) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        Выберите время для расчёта стоимости
      </div>
    );
  }

  if (draft.guestCount < 1) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        Укажите количество гостей для расчёта стоимости
      </div>
    );
  }

  if (isLoading && categoryId !== "banyaTest") {
    return (
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-6">
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
        <p className="text-center text-sm text-slate-500">Расчёт стоимости…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </div>
    );
  }

  const isBanyaLike = categoryId === "banya" || categoryId === "banyaTest";
  const baseLabel = isBanyaLike ? "Стоимость бани" : "Проживание";

  return (
    <div className="setup-price-breakdown space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Подробный расчёт
      </p>

      {categoryId === "homes" && homesCalc && (
        <ul className="space-y-1 text-slate-600">
          {homesCalc.nightPrices.map((night) => (
            <li key={night.date} className="flex justify-between gap-3">
              <span>Ночь {formatNightDate(night.date)}</span>
              <span className="shrink-0 tabular-nums font-medium text-slate-900">
                {night.price.toLocaleString("ru-RU")} ₽
              </span>
            </li>
          ))}
          {homesCalc.periodMessage && (
            <li className="text-xs text-amber-800">{homesCalc.periodMessage}</li>
          )}
        </ul>
      )}

      {isBanyaLike && banyaCalc && banyaCalc.lines.length > 0 && (
        <ul className="space-y-1 text-slate-600">
          {banyaCalc.lines.map((line, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>{line.label}</span>
              <span className="shrink-0 tabular-nums font-medium text-slate-900">
                {line.amount.toLocaleString("ru-RU")} ₽
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-1.5 border-t border-slate-200 pt-2">
        <div className="flex justify-between gap-3 text-slate-600">
          <span>{baseLabel}</span>
          <span className="shrink-0 tabular-nums font-medium text-slate-900">
            {(draft.basePrice ?? 0).toLocaleString("ru-RU")} ₽
          </span>
        </div>
        <div className="flex justify-between gap-3 text-slate-600">
          <span>Доп. товары</span>
          <span className="shrink-0 tabular-nums font-medium text-slate-900">
            {productsSubtotal.toLocaleString("ru-RU")} ₽
          </span>
        </div>
        {productLines.length > 0 && (
          <ul className="ml-1 space-y-0.5 text-xs text-slate-500">
            {productLines.map(({ product, qty, lineTotal }) => (
              <li key={product.id} className="flex justify-between gap-2">
                <span className="min-w-0 truncate">
                  {product.name} ×{qty}
                </span>
                <span className="shrink-0 tabular-nums">
                  {lineTotal.toLocaleString("ru-RU")} ₽
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
          <span>Итого</span>
          <span className="tabular-nums">{total.toLocaleString("ru-RU")} ₽</span>
        </div>
      </div>
    </div>
  );
};
