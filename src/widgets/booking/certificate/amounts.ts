/** Сумма сертификата для экрана, ₽. */
export function formatCertificateAmount(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}
