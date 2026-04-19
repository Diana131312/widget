import React from "react";
import type { WidgetProduct } from "../../../../api/widgetApi.types";
import type { BookingDraft } from "../../types";
import { Separator } from "../../../../components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../../components/ui/accordion";
import { cn } from "../../../../lib/utils";

export type PriceLineItem = {
  product: WidgetProduct;
  qty: number;
  lineTotal: number;
};

type Props = {
  draft: BookingDraft;
  productLines: PriceLineItem[];
  productsSubtotal: number;
  total: number;
  /** Заголовок блока на десктопе */
  className?: string;
};

export const BookingPriceBreakdown: React.FC<Props> = ({
  draft,
  productLines,
  productsSubtotal,
  total,
  className,
}) => {
  const calcBlock = (
    <>
      <div className="space-y-1.5 px-1 text-xs md:text-[13px]">
        <div className="flex justify-between gap-2 text-slate-600">
          <span>Баня</span>
          <span className="truncate text-right font-medium text-slate-900">{draft.roomName}</span>
        </div>
        <div className="flex justify-between gap-2 text-slate-600">
          <span>Дата</span>
          <span className="font-medium text-slate-900">{draft.date}</span>
        </div>
        <div className="flex justify-between gap-2 text-slate-600">
          <span>Время</span>
          <span className="font-medium text-slate-900">
            {draft.timeFrom} — {draft.timeTo}
          </span>
        </div>
        <div className="flex justify-between gap-2 text-slate-600">
          <span>Гостей</span>
          <span className="font-medium tabular-nums text-slate-900">{draft.guestCount}</span>
        </div>
      </div>

      <Separator className="my-2" />

      <div className="space-y-2 px-1 pb-1">
        <div className="flex justify-between text-xs md:text-[13px]">
          <span className="text-slate-600">Бронирование (базовая стоимость)</span>
          <span className="font-semibold tabular-nums text-slate-900">
            {draft.basePrice.toLocaleString("ru-RU")} ₽
          </span>
        </div>
        {productLines.length > 0 ? (
          <>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Дополнительные товары
            </p>
            <ul className="space-y-1 rounded-md bg-white p-1.5 text-xs shadow-sm ring-1 ring-slate-100 md:text-[13px]">
              {productLines.map(({ product, qty, lineTotal }) => (
                <li key={product.id} className="flex justify-between gap-2">
                  <span className="min-w-0 text-slate-700">
                    <span className="line-clamp-2">{product.name}</span>{" "}
                    <span className="text-slate-500">×{qty}</span>
                  </span>
                  <span className="shrink-0 tabular-nums font-medium text-slate-900">
                    {lineTotal.toLocaleString("ru-RU")} ₽
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between text-xs text-slate-600 md:text-[13px]">
              <span>Подытог по доп. товарам</span>
              <span className="tabular-nums font-medium text-slate-900">
                {productsSubtotal.toLocaleString("ru-RU")} ₽
              </span>
            </div>
          </>
        ) : (
          <p className="text-[11px] text-slate-500">Доп. товары не выбраны</p>
        )}
        <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-semibold">
          <span className="text-slate-900">Итого к оплате</span>
          <span className="tabular-nums text-slate-900">{total.toLocaleString("ru-RU")} ₽</span>
        </div>
      </div>
    </>
  );

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-col gap-3", className)}>
      <div className="hidden min-h-0 flex-1 flex-col md:flex">
        <p className="mb-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Калькуляция
        </p>
        <div className="min-h-[72px] max-h-[min(220px,40vh)] flex-1 overflow-y-auto overscroll-contain rounded-md border border-slate-200 bg-slate-50/90 py-1">
          {calcBlock}
        </div>
      </div>

      <Accordion type="single" collapsible className="md:hidden">
        <AccordionItem value="calc" className="rounded-md border border-slate-200 bg-slate-50 px-2">
          <AccordionTrigger className="py-2 text-xs font-semibold hover:no-underline">
            Калькуляция
          </AccordionTrigger>
          <AccordionContent className="max-h-[min(200px,45vh)] overflow-y-auto overscroll-contain pb-2">
            {calcBlock}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
