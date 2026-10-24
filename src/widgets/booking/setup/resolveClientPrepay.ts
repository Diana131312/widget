/**
 * Флаг prepayIncludesProducts=true из /calculate|/daily-calculate —
 * сигнал клиенту: прибавить сумму доп. товаров к prepay
 * (сами методы calculate товары в prepay не кладут).
 */
export function resolveClientPrepay(
  apiPrepay: number | null | undefined,
  productsSubtotal: number,
  prepayIncludesProducts?: boolean | null
): number | null {
  const base =
    apiPrepay != null && Number.isFinite(apiPrepay) && apiPrepay > 0
      ? apiPrepay
      : 0;
  const products =
    prepayIncludesProducts === true
      ? Math.max(0, Number(productsSubtotal) || 0)
      : 0;
  const total = base + products;
  return total > 0 ? total : null;
}
