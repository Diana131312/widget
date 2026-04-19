import { useMemo } from "react";
import type { WidgetProduct, WidgetProductGroup } from "../../../../api/widgetApi.types";
import type { BookingDraft, StepperState } from "../../types";
import { completeBookingDraft } from "../../types";
import type { GroupWithProducts } from "./ProductGroupAccordion";
import { useBookingFlow } from "../../booking/BookingFlowContext";

const UNGROUPED_GROUP_ID = "__ungrouped_products__";

export function useBookingCatalog(state: StepperState) {
  const { draft: flowDraft, patchDraft } = useBookingFlow();
  const draft = completeBookingDraft(flowDraft);
  const config = state.data.config;

  const patchCompleteDraft = (partial: Partial<BookingDraft>) => {
    if (!draft) return;
    patchDraft({ ...draft, ...partial });
  };

  const setProductQty = (productId: string, next: number) => {
    if (!draft) return;
    const prev = draft.productQuantities ?? {};
    const nextMap = { ...prev };
    if (next <= 0) delete nextMap[productId];
    else nextMap[productId] = next;
    patchCompleteDraft({ productQuantities: nextMap });
  };

  const groupedForRoom = useMemo(() => {
    if (!config || !draft?.roomId)
      return { groups: [] as GroupWithProducts[], productsById: new Map<string, WidgetProduct>() };

    const roomId = draft.roomId;
    const groupMap = new Map<string, WidgetProductGroup>();
    for (const g of config.productGroups) {
      groupMap.set(g.id, g);
    }

    const filtered = config.products.filter(
      (p) =>
        p.isPublic &&
        (!Array.isArray(p.roomIds) || p.roomIds.length === 0 || p.roomIds.includes(roomId))
    );

    const byGroup = new Map<string, WidgetProduct[]>();
    const productsById = new Map<string, WidgetProduct>();

    for (const p of filtered) {
      productsById.set(p.id, p);
      const gid = p.productGroupId ?? UNGROUPED_GROUP_ID;
      if (!byGroup.has(gid)) byGroup.set(gid, []);
      byGroup.get(gid)!.push(p);
    }

    const groups: GroupWithProducts[] = [];
    for (const [gid, products] of byGroup) {
      if (products.length === 0) continue;
      let group: WidgetProductGroup;
      if (gid === UNGROUPED_GROUP_ID) {
        group = { id: UNGROUPED_GROUP_ID, name: "Другое", image: null };
      } else {
        const found = groupMap.get(gid);
        group = found ?? { id: gid, name: "Категория", image: null };
      }
      groups.push({ group, products });
    }

    return { groups, productsById };
  }, [config, draft?.roomId]);

  const quantities = draft?.productQuantities ?? {};

  const productLines = useMemo(() => {
    if (!draft) return [];
    const lines: { product: WidgetProduct; qty: number; lineTotal: number }[] = [];
    for (const [id, qty] of Object.entries(quantities)) {
      if (qty <= 0) continue;
      const product = groupedForRoom.productsById.get(id);
      if (!product) continue;
      lines.push({ product, qty, lineTotal: product.price * qty });
    }
    return lines.sort((a, b) => a.product.name.localeCompare(b.product.name, "ru"));
  }, [draft, quantities, groupedForRoom.productsById]);

  const productsSubtotal = useMemo(
    () => productLines.reduce((s, l) => s + l.lineTotal, 0),
    [productLines]
  );

  const total = (draft?.basePrice ?? 0) + productsSubtotal;

  return {
    draft,
    config,
    patchDraft: patchCompleteDraft,
    setProductQty,
    groupedForRoom,
    quantities,
    productLines,
    productsSubtotal,
    total,
  };
}
