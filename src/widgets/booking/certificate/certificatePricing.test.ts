import { describe, expect, it } from "vitest";
import { formatCertificateAmount } from "./amounts";
import {
  certificatePayAmount,
  formatCertificateQty,
  formatCertificateTerm,
  formatDurationMonths,
} from "./certificatePricing";

describe("certificatePayAmount", () => {
  it("keeps the nominal without a discount and rounds the discounted payment", () => {
    expect(certificatePayAmount(5000, 1, 0)).toBe(5000);
    expect(certificatePayAmount(5000, 1, 10)).toBe(4500);
    expect(certificatePayAmount(2500, 2, 10)).toBe(4500);
  });
});

describe("formatCertificateQty", () => {
  it("writes one certificate as a count and several as a product", () => {
    expect(formatCertificateQty(1, 3000)).toBe(
      `1 шт ${formatCertificateAmount(3000)} ₽`
    );
    expect(formatCertificateQty(2, 3000)).toBe(
      `2 шт × ${formatCertificateAmount(3000)} ₽ = ${formatCertificateAmount(6000)} ₽`
    );
  });
});

describe("formatCertificateTerm", () => {
  it("uses a short term in the summary", () => {
    expect(formatCertificateTerm(null)).toBe("Бессрочный");
    expect(formatCertificateTerm(6)).toBe("6 месяцев");
  });
});

describe("formatDurationMonths", () => {
  it("describes a fixed term and an open-ended certificate", () => {
    expect(formatDurationMonths(null)).toBe("Бессрочный");
    expect(formatDurationMonths(1)).toBe("Действует 1 месяц с дня покупки");
    expect(formatDurationMonths(12)).toBe("Действует 12 месяцев с дня покупки");
  });
});
