export const PAPER_CERTIFICATE_EMAIL = "les174.com@yandex.ru";

export type CertificateFormat = "paper" | "electronic";

const PAPER_MARK = "Подарочный сертификат";
const ELECTRONIC_MARK = "Электронный сертификат";

/** Электронный проверяем раньше: в названии может встретиться и «подарочный». */
export function certificateFormatOf(name: string): CertificateFormat | null {
  if (name.includes(ELECTRONIC_MARK)) return "electronic";
  if (name.includes(PAPER_MARK)) return "paper";
  return null;
}

export function matchesCertificateFormat(
  name: string,
  format: CertificateFormat
): boolean {
  return certificateFormatOf(name) === format;
}
