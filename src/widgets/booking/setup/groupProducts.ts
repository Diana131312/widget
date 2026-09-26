import type {
  WidgetGetResponse,
  WidgetProduct,
  WidgetProductGroup,
} from "../../../api";
import type { BookingCategoryId } from "../types";
import { isExtraGuestProduct } from "./isExtraGuestProduct";

export const UNGROUPED_GROUP_ID = "__ungrouped_products__";

export type GroupWithProducts = {
  group: WidgetProductGroup;
  products: WidgetProduct[];
};

export type GroupedCatalog = {
  groups: GroupWithProducts[];
  productsById: Map<string, WidgetProduct>;
  /** Услуга «доп. гости» (вынесена из секций), если есть для комнаты. */
  extraGuestProduct: WidgetProduct | null;
};

function filterProductsForRoom(
  products: WidgetProduct[],
  categoryId: BookingCategoryId,
  roomId: string
): WidgetProduct[] {
  return products.filter((p) => {
    if (!p.isPublic) return false;
    if (categoryId === "homes") {
      const ids = p.dailyRoomIds;
      if (!Array.isArray(ids)) return true;
      return ids.includes(roomId);
    }
    const ids = p.roomIds;
    if (!Array.isArray(ids) || ids.length === 0) return true;
    return ids.includes(roomId);
  });
}

export function groupProductsForRoom(
  config: WidgetGetResponse,
  categoryId: BookingCategoryId,
  roomId: string
): GroupedCatalog {
  const groupMap = new Map<string, WidgetProductGroup>();
  for (const g of config.productGroups ?? []) {
    groupMap.set(g.id, g);
  }

  const filtered = filterProductsForRoom(
    config.products ?? [],
    categoryId,
    roomId
  );

  const productsById = new Map<string, WidgetProduct>();
  const byGroup = new Map<string, WidgetProduct[]>();
  let extraGuestProduct: WidgetProduct | null = null;

  for (const p of filtered) {
    productsById.set(p.id, p);

    if (isExtraGuestProduct(p.name)) {
      if (!extraGuestProduct) extraGuestProduct = p;
      continue;
    }

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

  groups.sort((a, b) => a.group.name.localeCompare(b.group.name, "ru"));

  return { groups, productsById, extraGuestProduct };
}
