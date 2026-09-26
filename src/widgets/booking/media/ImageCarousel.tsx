import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  isBookingImageCached,
  preloadBookingImage,
  preloadBookingImages,
  resolveBookingImageUrls,
} from "./imageCache";

export type BookingImageCarouselVariant = "card" | "modal";

type Props = {
  imageRefs: string[];
  tenantId: string | null;
  alt: string;
  variant?: BookingImageCarouselVariant;
  preloadAll?: boolean;
  storageSize?: number;
  /**
   * Меньший размер (как в карточке) — показываем сразу из кэша,
   * пока догружается storageSize. Для modal.
   */
  previewSize?: number;
  initialIndex?: number;
  onImageClick?: (index: number) => void;
};

const DEFAULT_CARD_SIZE = 800;
const DEFAULT_MODAL_SIZE = 1200;

export const BookingImageCarousel: React.FC<Props> = ({
  imageRefs,
  tenantId,
  alt,
  variant = "card",
  preloadAll = false,
  storageSize,
  previewSize,
  initialIndex = 0,
  onImageClick,
}) => {
  const size =
    storageSize ?? (variant === "modal" ? DEFAULT_MODAL_SIZE : DEFAULT_CARD_SIZE);

  const slides = useMemo(
    () => resolveBookingImageUrls(imageRefs, tenantId, size),
    [imageRefs, tenantId, size]
  );

  const previewSlides = useMemo(() => {
    if (!previewSize || previewSize === size) return null;
    return resolveBookingImageUrls(imageRefs, tenantId, previewSize);
  }, [imageRefs, tenantId, previewSize, size]);

  const [index, setIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  /** Hi-res URL, уже показанный через <img onLoad> или preload */
  const [hiResReady, setHiResReady] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setImageErrors(new Set());
    setHiResReady(new Set());
    const safe =
      slides.length === 0
        ? 0
        : Math.min(Math.max(initialIndex, 0), slides.length - 1);
    setIndex(safe);
  }, [slides, initialIndex]);

  useEffect(() => {
    if (slides.length === 0) return;
    if (preloadAll) {
      void preloadBookingImages(slides).then(() => {
        setHiResReady((prev) => {
          const next = new Set(prev);
          slides.forEach((u) => {
            if (isBookingImageCached(u)) next.add(u);
          });
          return next;
        });
      });
      return;
    }
    const first = slides[0];
    if (first && !isBookingImageCached(first)) {
      void preloadBookingImages([first]);
    }
  }, [slides, preloadAll]);

  // Догрузка hi-res текущего слайда, если сейчас виден preview
  useEffect(() => {
    const url = slides[index];
    if (!url || isBookingImageCached(url) || hiResReady.has(url)) return;
    let cancelled = false;
    void preloadBookingImage(url)
      .then(() => {
        if (!cancelled) {
          setHiResReady((prev) => new Set(prev).add(url));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [slides, index, hiResReady]);

  const markLoaded = useCallback((url: string) => {
    setHiResReady((prev) => new Set(prev).add(url));
  }, []);

  const markError = useCallback((url: string) => {
    setImageErrors((prev) => new Set(prev).add(url));
  }, []);

  const goPrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (slides.length <= 1) return;
      setIndex((i) => (i - 1 + slides.length) % slides.length);
    },
    [slides.length]
  );

  const goNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (slides.length <= 1) return;
      setIndex((i) => (i + 1) % slides.length);
    },
    [slides.length]
  );

  const rootClass = [
    "booking-carousel",
    variant === "modal" ? "booking-carousel--modal" : "",
    slides.length === 0 ? "booking-carousel--empty" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const clickable = Boolean(onImageClick);

  const currentUrl = slides[index] ?? "";
  const previewUrl = previewSlides?.[index] ?? null;
  const currentHasError = Boolean(currentUrl && imageErrors.has(currentUrl));
  const hiResOk =
    Boolean(currentUrl) &&
    (isBookingImageCached(currentUrl) || hiResReady.has(currentUrl));
  const previewCached = Boolean(
    previewUrl && isBookingImageCached(previewUrl)
  );
  const showSkeleton =
    slides.length > 0 && !currentHasError && !hiResOk && !previewCached;

  const mediaInner =
    slides.length === 0 ? (
      <span className="booking-carousel__placeholder">Нет фото</span>
    ) : (
      <>
        {showSkeleton && (
          <div className="booking-carousel__skeleton" aria-hidden />
        )}
        <div className="booking-carousel__track">
          {slides.map((url, i) => {
            if (imageErrors.has(url)) return null;
            const preview = previewSlides?.[i];
            const ready = isBookingImageCached(url) || hiResReady.has(url);
            const src =
              ready || !preview || !isBookingImageCached(preview)
                ? url
                : preview;
            return (
              <img
                key={url}
                className={[
                  "booking-carousel__image",
                  i === index ? "booking-carousel__image--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                src={src}
                alt={`${alt} — фото ${i + 1}`}
                loading={preloadAll || i === 0 ? "eager" : "lazy"}
                decoding="async"
                onLoad={() => {
                  if (src === url) markLoaded(url);
                }}
                onError={() => markError(url)}
              />
            );
          })}
        </div>
        {currentHasError && (
          <div className="booking-carousel__placeholder booking-carousel__placeholder--overlay">
            Не удалось загрузить фото
          </div>
        )}
      </>
    );

  return (
    <div className={rootClass}>
      {clickable ? (
        <button
          type="button"
          className="booking-carousel__open"
          onClick={() => onImageClick?.(index)}
          aria-label={`${alt}: открыть галерею`}
        >
          {mediaInner}
        </button>
      ) : (
        mediaInner
      )}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            className="booking-carousel__nav booking-carousel__nav--prev"
            onClick={goPrev}
            aria-label="Предыдущее фото"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="booking-carousel__nav booking-carousel__nav--next"
            onClick={goNext}
            aria-label="Следующее фото"
          >
            <ChevronRight size={16} />
          </button>

          <div
            className="booking-carousel__dots"
            role="tablist"
            aria-label="Фотографии"
          >
            {slides.map((url, i) => (
              <button
                key={url}
                type="button"
                role="tab"
                aria-selected={i === index}
                className={[
                  "booking-carousel__dot",
                  i === index ? "booking-carousel__dot--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex(i);
                }}
                aria-label={`Фото ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
