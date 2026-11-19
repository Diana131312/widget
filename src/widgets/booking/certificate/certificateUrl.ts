import type { CertificateFormat } from "./certificateFormat";
import { clampCertificateCount } from "./certificatePricing";

const PREFIX = "bk_";

const CERT_KEYS = [
  "cert",
  "camount",
  "cid",
  "ccount",
  "cto",
  "cpromo",
  "clast",
  "cfirst",
  "cphone",
  "cemail",
  "ccomment",
  "cchannel",
  "cmsg",
  "cterms",
  "cformat",
] as const;

export type CertificatePhase = "pick" | "buyer";

export type CertificateMessenger = "telegram" | "max" | "call";

export type CertificateUrlState = {
  phase: CertificatePhase | null;
  certificateId: string | null;
  count: number;
  recipientName: string;
  promoCode: string;
  lastName: string;
  firstName: string;
  phone: string;
  email: string;
  messenger: CertificateMessenger | "";
  termsAccepted: boolean;
  format: CertificateFormat | null;
};

export const EMPTY_CERTIFICATE_URL: CertificateUrlState = {
  phase: null,
  certificateId: null,
  count: 1,
  recipientName: "",
  promoCode: "",
  lastName: "",
  firstName: "",
  phone: "",
  email: "",
  messenger: "",
  termsAccepted: false,
  format: null,
};

const PHASES = new Set<CertificatePhase>(["pick", "buyer"]);
const MESSENGERS = new Set<CertificateMessenger>(["telegram", "max", "call"]);

const FORMATS = new Set<CertificateFormat>(["paper", "electronic"]);

/** Прямая ссылка только на сертификаты: ?cert_only */
export function isCertificateStandalone(
  search: string = typeof window !== "undefined" ? window.location.search : ""
): boolean {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );
  return (
    params.has("cert_only") ||
    params.get(`${PREFIX}certonly`) === "1"
  );
}

function readParam(params: URLSearchParams, key: string): string | null {
  const value = params.get(`${PREFIX}${key}`);
  if (value == null || value.trim() === "") return null;
  return value.trim();
}

/** Смена экрана сертификата → push; правка полей → replace. */
export function certificateNavigationKey(state: CertificateUrlState): string {
  return state.phase ?? "";
}

let lastWrittenNavKey: string | null = null;

export function rememberCertificateUrlKey(state: CertificateUrlState): void {
  lastWrittenNavKey = certificateNavigationKey(state);
}

export function resetCertificateUrlKey(): void {
  lastWrittenNavKey = null;
}

export function parseCertificateUrl(
  search: string = typeof window !== "undefined" ? window.location.search : ""
): CertificateUrlState {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );
  const phaseRaw = readParam(params, "cert");
  let phase: CertificatePhase | null =
    phaseRaw && PHASES.has(phaseRaw as CertificatePhase)
      ? (phaseRaw as CertificatePhase)
      : null;
  if (!phase && isCertificateStandalone(search)) phase = "pick";

  const certificateId = readParam(params, "cid");
  if (phase === "buyer" && !certificateId) phase = "pick";

  const formatRaw = readParam(params, "cformat");
  let format: CertificateFormat | null =
    formatRaw && FORMATS.has(formatRaw as CertificateFormat)
      ? (formatRaw as CertificateFormat)
      : null;
  if (!format && phase) format = "electronic";

  const messengerRaw = readParam(params, "cmsg");
  const messenger: CertificateMessenger | "" =
    messengerRaw && MESSENGERS.has(messengerRaw as CertificateMessenger)
      ? (messengerRaw as CertificateMessenger)
      : "";

  if (!phase) return { ...EMPTY_CERTIFICATE_URL };

  return {
    phase,
    certificateId,
    count: clampCertificateCount(Number.parseInt(readParam(params, "ccount") ?? "1", 10)),
    recipientName: readParam(params, "cto") ?? "",
    promoCode: readParam(params, "cpromo") ?? "",
    lastName: readParam(params, "clast") ?? "",
    firstName: readParam(params, "cfirst") ?? "",
    phone: readParam(params, "cphone") ?? "",
    email: readParam(params, "cemail") ?? "",
    messenger,
    termsAccepted: readParam(params, "cterms") === "1",
    format,
  };
}

function clearCertificateParams(url: URL): void {
  for (const key of CERT_KEYS) {
    url.searchParams.delete(`${PREFIX}${key}`);
  }
}

export type WriteCertificateUrlOptions = {
  mode?: "auto" | "push" | "replace";
};

/** Пишет только параметры сертификата и не трогает параметры брони. */
export function writeCertificateUrl(
  state: CertificateUrlState,
  options?: WriteCertificateUrlOptions
): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  clearCertificateParams(url);

  const bareStandalonePick =
    isCertificateStandalone(url.search) &&
    state.phase === "pick" &&
    !state.certificateId &&
    !state.format &&
    !state.recipientName.trim() &&
    !state.promoCode.trim() &&
    !state.email.trim() &&
    !state.lastName.trim() &&
    !state.firstName.trim() &&
    !state.phone.trim() &&
    !state.messenger &&
    !state.termsAccepted;

  if (state.phase && !bareStandalonePick) {
    url.searchParams.set(`${PREFIX}cert`, state.phase);
    if (state.certificateId) {
      url.searchParams.set(`${PREFIX}cid`, state.certificateId);
    }
    const count = clampCertificateCount(state.count);
    if (count !== 1) {
      url.searchParams.set(`${PREFIX}ccount`, String(count));
    }
    if (state.recipientName.trim()) {
      url.searchParams.set(`${PREFIX}cto`, state.recipientName.trim());
    }
    if (state.promoCode.trim()) {
      url.searchParams.set(`${PREFIX}cpromo`, state.promoCode.trim());
    }
    if (state.lastName.trim()) {
      url.searchParams.set(`${PREFIX}clast`, state.lastName.trim());
    }
    if (state.firstName.trim()) {
      url.searchParams.set(`${PREFIX}cfirst`, state.firstName.trim());
    }
    if (state.phone.trim()) {
      url.searchParams.set(`${PREFIX}cphone`, state.phone.trim());
    }
    if (state.email.trim()) {
      url.searchParams.set(`${PREFIX}cemail`, state.email.trim());
    }
    if (state.messenger) {
      url.searchParams.set(`${PREFIX}cmsg`, state.messenger);
    }
    if (state.termsAccepted) {
      url.searchParams.set(`${PREFIX}cterms`, "1");
    }
    if (state.format) {
      url.searchParams.set(`${PREFIX}cformat`, state.format);
    }
  }

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const navKey = certificateNavigationKey(state);
  const mode = options?.mode ?? "auto";
  let usePush = false;
  if (mode === "push") usePush = true;
  else if (mode === "replace") usePush = false;
  else usePush = lastWrittenNavKey != null && lastWrittenNavKey !== navKey;

  if (next !== current) {
    const historyState = {
      ...(window.history.state as object),
      bkCert: navKey,
    };
    if (usePush) window.history.pushState(historyState, "", next);
    else window.history.replaceState(historyState, "", next);
  }

  lastWrittenNavKey = navKey;
}
