const RELOAD_GUARD = "bk-build-reload";

/** Новый адрес документа, если эта копия страницы старше опубликованной. */
export function freshDocumentUrl(href: string, remoteId: string): string | null {
  const url = new URL(href);
  if (url.searchParams.get("_v") === remoteId) return null;
  url.searchParams.set("_v", remoteId);
  // Флаги вроде cert_only остаются без «=».
  const parts: string[] = [];
  url.searchParams.forEach((value, key) => {
    parts.push(value === "" ? key : `${key}=${encodeURIComponent(value)}`);
  });
  const search = parts.length > 0 ? `?${parts.join("&")}` : "";
  return `${url.origin}${url.pathname}${search}${url.hash}`;
}

/**
 * null — перезагрузка не нужна.
 * Строка — адрес, по которому браузер возьмёт свежий index.html.
 */
export function planFreshReload(args: {
  localId: string | null;
  remoteId: string | null;
  href: string;
  alreadyTried: string | null;
}): string | null {
  const localId = args.localId?.trim() ?? "";
  const remoteId = args.remoteId?.trim() ?? "";
  if (!localId || !remoteId || localId === remoteId) return null;
  if (args.alreadyTried === remoteId) return null;
  return freshDocumentUrl(args.href, remoteId);
}

/**
 * Сборка кладёт id в index.html и в version.json.
 * Хеши у скриптов уже новые, но сам index.html браузер и GitHub Pages держат в кеше.
 * Если id разошлись, один раз открываем страницу с ?_v=… — это другой адрес, кеш его не отдаёт.
 */
export async function ensureFreshBuild(): Promise<void> {
  if (!import.meta.env.PROD || typeof window === "undefined") return;

  const localId =
    document.querySelector('meta[name="bk-build"]')?.getAttribute("content") ??
    null;

  let remoteId: string | null = null;
  try {
    const versionUrl = new URL(
      `${import.meta.env.BASE_URL}version.json`,
      window.location.origin
    );
    versionUrl.searchParams.set("t", String(Date.now()));
    const response = await fetch(versionUrl.toString(), { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { id?: unknown };
    remoteId = typeof data.id === "string" ? data.id : null;
  } catch {
    return;
  }

  let alreadyTried: string | null = null;
  try {
    alreadyTried = window.sessionStorage.getItem(RELOAD_GUARD);
  } catch {
    alreadyTried = null;
  }

  const next = planFreshReload({
    localId,
    remoteId,
    href: window.location.href,
    alreadyTried,
  });
  if (!next || !remoteId) return;

  try {
    window.sessionStorage.setItem(RELOAD_GUARD, remoteId);
  } catch {
    return;
  }
  window.location.replace(next);
}
