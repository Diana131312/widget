import { beforeEach, describe, expect, it } from "vitest";
import {
  parseCertificateUrl,
  resetCertificateUrlKey,
  writeCertificateUrl,
  type CertificateUrlState,
} from "./certificateUrl";

const base: CertificateUrlState = {
  phase: "pick",
  certificateId: "cert-1",
  count: 1,
  recipientName: "Анна",
  promoCode: "",
  lastName: "",
  firstName: "",
  phone: "",
  email: "",
  messenger: "",
  termsAccepted: false,
};

beforeEach(() => {
  resetCertificateUrlKey();
  window.history.replaceState({}, "", "/?bk_step=category");
});

describe("parseCertificateUrl", () => {
  it("restores the buyer step and entered fields", () => {
    expect(
      parseCertificateUrl(
        "?bk_step=category&bk_cert=buyer&bk_cid=cert-1&bk_ccount=2&bk_cto=Анна&bk_cpromo=LES&bk_clast=Иванов&bk_cfirst=Иван&bk_cphone=%2B7%20(900)%20123-45-67&bk_cemail=ivan%40mail.ru&bk_cmsg=telegram&bk_cterms=1"
      )
    ).toMatchObject({
      phase: "buyer",
      certificateId: "cert-1",
      count: 2,
      recipientName: "Анна",
      promoCode: "LES",
      lastName: "Иванов",
      firstName: "Иван",
      phone: "+7 (900) 123-45-67",
      email: "ivan@mail.ru",
      messenger: "telegram",
      termsAccepted: true,
    });
  });

  it("keeps the pick step when the buyer link has no certificate", () => {
    expect(parseCertificateUrl("?bk_cert=buyer")).toMatchObject({
      phase: "pick",
      certificateId: null,
    });
  });
});

describe("writeCertificateUrl", () => {
  it("pushes a new entry when the certificate screen changes and keeps booking params", () => {
    writeCertificateUrl(base);

    const push = window.history.pushState.bind(window.history);
    let pushed = 0;
    window.history.pushState = ((...args: Parameters<History["pushState"]>) => {
      pushed += 1;
      return push(...args);
    }) as History["pushState"];

    writeCertificateUrl({
      ...base,
      phase: "buyer",
      count: 2,
      promoCode: "LES",
      lastName: "Иванов",
      firstName: "Иван",
      phone: "+7 (900) 123-45-67",
      email: "ivan@mail.ru",
      messenger: "whatsapp",
      termsAccepted: true,
    });

    expect(pushed).toBe(1);
    expect(window.location.search).toContain("bk_step=category");
    expect(window.location.search).toContain("bk_cert=buyer");
    expect(window.location.search).toContain("bk_cid=cert-1");
    expect(window.location.search).toContain("bk_ccount=2");
    expect(window.location.search).toContain("bk_cmsg=whatsapp");
    expect(window.location.search).toContain("bk_cterms=1");
    expect(parseCertificateUrl().recipientName).toBe("Анна");
    expect(parseCertificateUrl().email).toBe("ivan@mail.ru");
  });
});
