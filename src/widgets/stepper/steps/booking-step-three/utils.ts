export {
  getWidgetAssetUrl,
  getGettimeStorageImageUrl,
  type WidgetAssetUrlOptions,
} from "../../../../lib/gettimeAssets";

/** Оставляем только цифры, нормализуем к российскому 7… (макс. 11 цифр) */
export function normalizeRuPhoneDigits(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("8")) d = "7" + d.slice(1);
  if (d.length && !d.startsWith("7")) d = "7" + d;
  return d.slice(0, 11);
}

/** Маска отображения: +7 (9XX) XXX-XX-XX */
export function formatRuPhoneMask(digits: string): string {
  const d = normalizeRuPhoneDigits(digits);
  if (!d.length) return "";
  const rest = d.slice(1);
  let out = "+7";
  if (rest.length) out += " (" + rest.slice(0, 3);
  if (rest.length >= 3) out += ")";
  if (rest.length > 3) out += " " + rest.slice(3, 6);
  if (rest.length > 6) out += "-" + rest.slice(6, 8);
  if (rest.length > 8) out += "-" + rest.slice(8, 10);
  return out;
}

export function isRuPhoneComplete(digits: string): boolean {
  return normalizeRuPhoneDigits(digits).length === 11;
}
