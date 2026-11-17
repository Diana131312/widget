import { describe, expect, it } from "vitest";
import { formatCertificateAmount } from "./amounts";
import { parseSaleCertificates } from "./parseCertificates";

describe("parseSaleCertificates", () => {
  it("keeps sellable certificates and drops broken rows", () => {
    expect(
      parseSaleCertificates([
        {
          id: "a",
          name: "Выходные",
          description: "Дом",
          price: 5000,
          durationMonths: 12,
          logo: "file",
        },
        { id: "b", name: "", price: 3000, durationMonths: null },
        { id: "", name: "Пустой", price: 1000 },
        { name: "Без id", price: 1000 },
        "нет",
      ])
    ).toEqual([
      {
        id: "a",
        name: "Выходные",
        description: "Дом",
        price: 5000,
        durationMonths: 12,
        logo: "file",
      },
      {
        id: "b",
        name: `Сертификат ${formatCertificateAmount(3000)} ₽`,
        description: "",
        price: 3000,
        durationMonths: null,
        logo: null,
      },
    ]);
  });

  it("returns an empty list when the config has no certificates", () => {
    expect(parseSaleCertificates(undefined)).toEqual([]);
    expect(parseSaleCertificates({})).toEqual([]);
  });
});
