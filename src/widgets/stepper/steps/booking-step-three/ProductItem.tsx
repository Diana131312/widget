import React from "react";
import type { WidgetProduct } from "../../../../api/widgetApi.types";
import { Button } from "../../../../components/ui/button";
import { cn } from "../../../../lib/utils";
import { getWidgetAssetUrl } from "./utils";

type Props = {
  product: WidgetProduct;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  assetsOrigin?: string;
  tenantId?: string | null;
};

export const ProductItem: React.FC<Props> = ({
  product,
  quantity,
  onIncrement,
  onDecrement,
  assetsOrigin,
  tenantId,
}) => {
  const img = getWidgetAssetUrl(product.image ?? null, assetsOrigin, { tenantId });

  return (
    <div
      className={cn(
        "flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow sm:gap-5 sm:p-5",
        quantity > 0 && "border-[#485548]/25 ring-1 ring-[#D4E4D7]/90"
      )}
    >
      {img ? (
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
          <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="font-medium text-slate-900">{product.name}</div>
        {product.description ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{product.description}</p>
        ) : null}
        <div className="mt-1 text-sm font-semibold text-slate-800">
          {product.price.toLocaleString("ru-RU")} ₽
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-center gap-1">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={onDecrement}
            disabled={quantity <= 0}
            aria-label="Убрать"
          >
            −
          </Button>
          <span className="min-w-[1.75rem] text-center text-sm font-semibold tabular-nums text-slate-900">
            {quantity}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={onIncrement}
            aria-label="Добавить"
          >
            +
          </Button>
        </div>
      </div>
    </div>
  );
};
