const DEFAULT_ASSETS_ORIGIN = "https://app.gettime.online";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function stripImageExt(file: string): string {
  return file.replace(/\.(jpg|jpeg|png|webp)$/i, "");
}

export type WidgetAssetUrlOptions = {
  /** settings.tenantId из GET /widget/get — если в конфиге только id файла */
  tenantId?: string | null;
  /** Размер превью в пути /api/storage/get/{size}/… (по умолчанию 300) */
  storageSize?: number;
};

/**
 * URL хранилища: https://app.gettime.online/api/storage/get/{size}/{folderId}/{fileId}.jpg
 */
export function getGettimeStorageImageUrl(
  ref: string | null | undefined,
  options?: { tenantId?: string | null; size?: number }
): string | null {
  if (!ref?.trim()) return null;
  const raw = ref.trim();

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  if (raw.includes("api/storage/get")) {
    const path = raw.replace(/^\/+/, "");
    return `${DEFAULT_ASSETS_ORIGIN.replace(/\/+$/, "")}/${path}`;
  }

  const size = options?.size ?? 300;
  const prefix = `${DEFAULT_ASSETS_ORIGIN}/api/storage/get/${size}`;

  const slash = raw.indexOf("/");
  if (slash !== -1) {
    const folderId = raw.slice(0, slash).trim();
    const fileId = stripImageExt(raw.slice(slash + 1).trim());
    if (folderId && fileId && UUID.test(folderId) && UUID.test(fileId)) {
      return `${prefix}/${folderId}/${fileId}.jpg`;
    }
  } else {
    const tenantId = options?.tenantId?.trim();
    const fileId = stripImageExt(raw);
    if (tenantId && fileId && UUID.test(tenantId) && UUID.test(fileId)) {
      return `${prefix}/${tenantId}/${fileId}.jpg`;
    }
  }

  return null;
}

export function getWidgetAssetUrl(
  path: string | null | undefined,
  origin: string = DEFAULT_ASSETS_ORIGIN,
  opts?: WidgetAssetUrlOptions
): string | null {
  if (!path?.trim()) return null;
  const t = path.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) {
    return t;
  }

  const storageUrl = getGettimeStorageImageUrl(path, {
    tenantId: opts?.tenantId,
    size: opts?.storageSize ?? 300,
  });
  if (storageUrl) return storageUrl;

  const base = origin.replace(/\/+$/, "");
  const p = t.replace(/^\/+/, "");
  return `${base}/${p}`;
}
