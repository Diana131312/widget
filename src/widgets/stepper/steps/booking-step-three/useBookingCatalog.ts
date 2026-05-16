import { useCallback, useMemo } from "react";
import type { WidgetProduct, WidgetProductGroup } from "../../../../api/widgetApi.types";
import type { BookingDraft, BookingFlowDraft, CategoryId, StepperState } from "../../types";
import { canEnterBookingSetup, completeBookingDraft } from "../../types";
import type { GroupWithProducts } from "./ProductGroupAccordion";
import { useBookingFlow } from "../../booking/BookingFlowContext";

const UNGROUPED_GROUP_ID = "__ungrouped_products__";

export function useBookingCatalog(state: StepperState) {
  const { categoryId, draft: flowDraft, patchDraft } = useBookingFlow();
  const setupDraft = canEnterBookingSetup(categoryId, flowDraft) ? flowDraft : null;
  const draft = completeBookingDraft(flowDraft, categoryId);
  const config = state.data.config;

  const patchFlowDraft = useCallback(
    (partial: Partial<BookingFlowDraft>) => {
      patchDraft(partial);
    },
    [patchDraft]
  );

  const patchCompleteDraft = (partial: Partial<BookingDraft>) => {
    if (!flowDraft) return;
    patchDraft({ ...flowDraft, ...partial });
  };

  const setProductQty = (productId: string, next: number) => {
    if (!setupDraft) return;
    const prev = setupDraft.productQuantities ?? {};
    const nextMap = { ...prev };
    if (next <= 0) delete nextMap[productId];
    else nextMap[productId] = next;
    patchFlowDraft({ productQuantities: nextMap });
  };

  const maxGuests = useMemo(() => {
    if (!config || !setupDraft?.roomId) return 10;
    if (categoryId === "homes") {
      const room = config.dailyRooms?.find((r) => r.id === setupDraft.roomId);
      return room?.maxCapacity ?? room?.capacity ?? 10;
    }
    const room = config.rooms?.find((r) => r.id === setupDraft.roomId);
    return room?.maxCapacity ?? room?.capacity ?? 10;
  }, [config, setupDraft?.roomId, categoryId]);

  const groupedForRoom = useMemo(() => {
    if (!config || !setupDraft?.roomId || !categoryId)
      return { groups: [] as GroupWithProducts[], productsById: new Map<string, WidgetProduct>() };

    const roomId = setupDraft.roomId;
    const groupMap = new Map<string, WidgetProductGroup>();
    for (const g of config.productGroups) {
      groupMap.set(g.id, g);
    }

    const filtered = config.products.filter((p) => {
      if (!p.isPublic) return false;
      if (categoryId === "homes") {
        const ids = p.dailyRoomIds;
        if (!Array.isArray(ids) ) return true;
        return ids.includes(roomId);
      }
      const ids = p.roomIds;
      if (!Array.isArray(ids) || ids.length === 0) return true;
      return ids.includes(roomId);
    });

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
  }, [config, setupDraft?.roomId, categoryId]);

  const quantities = setupDraft?.productQuantities ?? {};

  const productLines = useMemo(() => {
    if (!setupDraft) return [];
    const lines: { product: WidgetProduct; qty: number; lineTotal: number }[] = [];
    for (const [id, qty] of Object.entries(quantities)) {
      if (qty <= 0) continue;
      const product = groupedForRoom.productsById.get(id);
      if (!product) continue;
      lines.push({ product, qty, lineTotal: product.price * qty });
    }
    return lines.sort((a, b) => a.product.name.localeCompare(b.product.name, "ru"));
  }, [setupDraft, quantities, groupedForRoom.productsById]);

  const productsSubtotal = useMemo(
    () => productLines.reduce((s, l) => s + l.lineTotal, 0),
    [productLines]
  );

  const total = (setupDraft?.basePrice ?? draft?.basePrice ?? 0) + productsSubtotal;

  return {
    categoryId: categoryId as CategoryId | undefined,
    setupDraft,
    draft,
    config,
    patchDraft: patchFlowDraft,
    patchCompleteDraft,
    setProductQty,
    groupedForRoom,
    quantities,
    productLines,
    productsSubtotal,
    total,
    maxGuests,
  };
}
