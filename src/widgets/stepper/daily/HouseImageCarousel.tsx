import React, { useState, useCallback, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../../lib/utils";
import {
  isHouseImageCached,
  preloadHouseImages,
  resolveHouseImageUrls,
} from "./houseImageCache";

export type HouseImageCarouselVariant = "card" | "modal";

type Props = {
  imageRefs: string[];
  tenantId: string | null;
  alt: string;
  variant?: HouseImageCarouselVariant;
  /** Предзагрузить все слайды параллельно (кэш сохраняется между открытиями модалки) */
  preloadAll?: boolean;
  storageSize?: number;
};

const DEFAULT_CARD_SIZE = 800;
const DEFAULT_MODAL_SIZE = 600;

export const HouseImageCarousel: React.FC<Props> = ({
  imageRefs,
  tenantId,
  alt,
  variant = "card",
  preloadAll = false,
  storageSize,
}) => {
  const size = storageSize ?? (variant === "modal" ? DEFAULT_MODAL_SIZE : DEFAULT_CARD_SIZE);

  const slides = useMemo(
    () => resolveHouseImageUrls(imageRefs, tenantId, size),
    [imageRefs, tenantId, size]
  );

  const [index, setIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(() => new Set());
  const [preloadDone, setPreloadDone] = useState(false);

  useEffect(() => {
    setIndex(0);
    setImageErrors(new Set());
    setLoadingImages(new Set());
    setPreloadDone(false);
  }, [slides]);

  useEffect(() => {
    if (slides.length === 0) return;

    if (preloadAll) {
      let cancelled = false;
      preloadHouseImages(slides).finally(() => {
        if (!cancelled) setPreloadDone(true);
      });
      return () => {
        cancelled = true;
      };
    }

    const first = slides[0];
    if (!isHouseImageCached(first)) {
      preloadHouseImages([first]);
    }
  }, [slides, preloadAll]);

  const markLoaded = useCallback((url: string) => {
    setLoadingImages((prev) => {
      const next = new Set(prev);
      next.delete(url);
      return next;
    });
    setImageErrors((prev) => {
      const next = new Set(prev);
      next.delete(url);
      return next;
    });
  }, []);

  const markError = useCallback((url: string) => {
    setLoadingImages((prev) => {
      const next = new Set(prev);
      next.delete(url);
      return next;
    });
    setImageErrors((prev) => new Set(prev).add(url));
  }, []);

  const markLoading = useCallback((url: string) => {
    if (isHouseImageCached(url)) return;
    setLoadingImages((prev) => new Set(prev).add(url));
  }, []);

  const goPrev = useCallback(() => {
    if (slides.length <= 1) return;
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goNext = useCallback(() => {
    if (slides.length <= 1) return;
    setIndex((i) => (i + 1) % slides.length);
  }, [slides.length]);

  const rootClass = cn(
    "daily-house-card__carousel",
    variant === "modal" && "daily-house-card__carousel--modal"
  );

  if (slides.length === 0) {
    return (
      <div className={cn(rootClass, "daily-house-card__carousel--empty")}>
        <span className="daily-house-card__carousel-placeholder">Нет фото</span>
      </div>
    );
  }

  const currentUrl = slides[index];
  const currentHasError = imageErrors.has(currentUrl);
  const currentIsLoading =
    preloadAll && !preloadDone
      ? !isHouseImageCached(currentUrl) && !currentHasError
      : loadingImages.has(currentUrl) && !currentHasError && !isHouseImageCached(currentUrl);

  return (
    <div className={rootClass}>
      {currentIsLoading && <div className="daily-house-card__carousel-skeleton" aria-hidden />}

      <div className="daily-house-card__carousel-track">
        {slides.map((url, i) => {
          if (imageErrors.has(url)) return null;

          return (
            <img
              key={url}
              className={cn(
                "daily-house-card__carousel-image",
                i === index && "daily-house-card__carousel-image--active"
              )}
              src={url}
              alt={`${alt} — фото ${i + 1}`}
              loading={preloadAll ? "eager" : i === 0 ? "eager" : "lazy"}
              decoding="async"
              onLoadStart={() => markLoading(url)}
              onLoad={() => markLoaded(url)}
              onError={() => markError(url)}
            />
          );
        })}
      </div>

      {currentHasError && (
        <div className="daily-house-card__carousel-placeholder daily-house-card__carousel-placeholder--overlay">
          Не удалось загрузить фото
        </div>
      )}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            className="daily-house-card__carousel-nav daily-house-card__carousel-nav--prev"
            onClick={goPrev}
            aria-label="Предыдущее фото"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="daily-house-card__carousel-nav daily-house-card__carousel-nav--next"
            onClick={goNext}
            aria-label="Следующее фото"
          >
            <ChevronRight size={20} />
          </button>

          <div className="daily-house-card__carousel-dots" role="tablist" aria-label="Фотографии">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Фото ${i + 1}`}
                className={cn(
                  "daily-house-card__carousel-dot",
                  i === index && "daily-house-card__carousel-dot--active"
                )}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
