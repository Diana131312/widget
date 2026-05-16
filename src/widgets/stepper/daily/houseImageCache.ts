import { getWidgetAssetUrl } from "../../../lib/gettimeAssets";

const loadedUrls = new Set<string>();
const inflight = new Map<string, Promise<void>>();

export function resolveHouseImageUrls(
  imageRefs: string[],
  tenantId: string | null,
  storageSize: number
): string[] {
  return imageRefs
    .map((ref) =>
      getWidgetAssetUrl(ref, undefined, {
        tenantId,
        storageSize,
      })
    )
    .filter((url): url is string => Boolean(url));
}

export function isHouseImageCached(url: string): boolean {
  return loadedUrls.has(url);
}

export function preloadHouseImage(url: string): Promise<void> {
  if (loadedUrls.has(url)) return Promise.resolve();

  const pending = inflight.get(url);
  if (pending) return pending;

  const promise = new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      loadedUrls.add(url);
      inflight.delete(url);
      resolve();
    };
    img.onerror = () => {
      inflight.delete(url);
      reject(new Error(`Failed to preload: ${url}`));
    };
    img.src = url;
  });

  inflight.set(url, promise);
  return promise;
}

/** Параллельная предзагрузка; ошибки отдельных фото не прерывают остальные. */
export function preloadHouseImages(urls: string[]): Promise<void> {
  if (urls.length === 0) return Promise.resolve();
  return Promise.all(
    urls.map((url) => preloadHouseImage(url).catch(() => undefined))
  ).then(() => undefined);
}
