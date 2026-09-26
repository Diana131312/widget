/** Нормализация для матча названия услуги «доп. гости». */
export function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Спецправило: доп. гость / дополнительные гости.
 * «доп»|«дополнительн…» + корень «гост».
 */
export function isExtraGuestProduct(name: string): boolean {
  const n = normalizeProductName(name);
  if (!n) return false;
  const hasDop = /доп(?:олнительн\w*)?/.test(n);
  const hasGuest = /гост/.test(n);
  return hasDop && hasGuest;
}
