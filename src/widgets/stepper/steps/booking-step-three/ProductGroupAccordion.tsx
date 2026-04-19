import React from "react";
import type { WidgetProduct, WidgetProductGroup } from "../../../../api/widgetApi.types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../../components/ui/accordion";
import { cn } from "../../../../lib/utils";
import { ProductItem } from "./ProductItem";
import { getWidgetAssetUrl } from "./utils";

export type GroupWithProducts = {
  group: WidgetProductGroup;
  products: WidgetProduct[];
};

type Props = {
  groups: GroupWithProducts[];
  quantities: Record<string, number>;
  onSetQuantity: (productId: string, next: number) => void;
  defaultOpenIds?: string[];
  assetsOrigin?: string;
  tenantId?: string | null;
};

export const ProductGroupAccordion: React.FC<Props> = ({
  groups,
  quantities,
  onSetQuantity,
  defaultOpenIds,
  assetsOrigin,
  tenantId,
}) => {
  /** По умолчанию все группы свернуты; передайте id, чтобы открыть выбранные. */
  const defaultValue = defaultOpenIds ?? [];

  return (
    <Accordion
      type="multiple"
      defaultValue={defaultValue}
      className="flex w-full flex-col gap-5 sm:gap-6"
    >
      {groups.map(({ group, products }) => {
        const headerImg = getWidgetAssetUrl(group.image, assetsOrigin, { tenantId });
        return (
          <AccordionItem
            key={group.id}
            value={group.id}
            className={cn(
              "overflow-hidden rounded-xl border border-slate-200 border-b-0 bg-white shadow-sm transition-[border-color,box-shadow]",
              "data-[state=open]:border-transparent data-[state=open]:shadow-none"
            )}
          >
            <AccordionTrigger className="px-3 py-2.5 text-left text-sm hover:no-underline sm:px-4 sm:py-3">
              <div className="flex w-full min-w-0 flex-1 items-center gap-3 pr-1">
                {headerImg ? (
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-12 sm:w-12">
                    <img src={headerImg} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-base font-semibold tracking-tight text-[#485548] sm:text-lg">
                    {group.name}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">{products.length} позиций</div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-4 pt-0 sm:px-3 sm:pb-5">
              <div className="flex flex-col gap-4 sm:gap-5">
                {products.map((p) => (
                  <ProductItem
                    key={p.id}
                    product={p}
                    quantity={quantities[p.id] ?? 0}
                    onIncrement={() => onSetQuantity(p.id, (quantities[p.id] ?? 0) + 1)}
                    onDecrement={() => onSetQuantity(p.id, Math.max(0, (quantities[p.id] ?? 0) - 1))}
                    assetsOrigin={assetsOrigin}
                    tenantId={tenantId}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};
