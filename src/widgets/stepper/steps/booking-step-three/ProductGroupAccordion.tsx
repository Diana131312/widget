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
    <Accordion type="multiple" defaultValue={defaultValue} className="w-full divide-y rounded-xl border border-slate-200 bg-white px-1">
      {groups.map(({ group, products }) => {
        const headerImg = getWidgetAssetUrl(group.image, assetsOrigin, { tenantId });
        return (
          <AccordionItem key={group.id} value={group.id} className="border-b-0 px-3">
            <AccordionTrigger className="py-4 text-left hover:no-underline">
              <div className="flex w-full items-center gap-3 pr-2">
                {headerImg ? (
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    <img src={headerImg} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className={cn("font-semibold text-slate-900")}>{group.name}</div>
                  <div className="text-xs text-slate-500">{products.length} позиций</div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pb-4">
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
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};
