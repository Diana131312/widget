import { formatCertificateAmount } from "./amounts";

/** Сертификат, который можно продать онлайн. Поля из GET /get/{alias}. */
export type SaleCertificate = {
  id: string;
  name: string;
  description: string;
  price: number;
  /** null — бессрочный */
  durationMonths: number | null;
  logo: string | null;
};

function readDuration(value: unknown): number | null {
  if (value == null || value === "") return null;
  const months = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(months) || months <= 0) return null;
  return Math.trunc(months);
}

function readCertificate(value: unknown): SaleCertificate | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const price = typeof raw.price === "number" ? raw.price : Number(raw.price);
  if (!id || !Number.isFinite(price) || price < 0) return null;

  const name =
    typeof raw.name === "string" && raw.name.trim()
      ? raw.name.trim()
      : `Сертификат ${formatCertificateAmount(price)} ₽`;
  const description =
    typeof raw.description === "string" ? raw.description.trim() : "";
  const logo =
    typeof raw.logo === "string" && raw.logo.trim() ? raw.logo.trim() : null;

  return {
    id,
    name,
    description,
    price,
    durationMonths: readDuration(raw.durationMonths),
    logo,
  };
}

/** В ответе уже только сертификаты с онлайн-продажей и макетом. */
export function parseSaleCertificates(raw: unknown): SaleCertificate[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const certificate = readCertificate(item);
    return certificate ? [certificate] : [];
  });
}
