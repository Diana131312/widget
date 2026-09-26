import React, { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { BookingImageCarousel } from "./ImageCarousel";
import { preloadBookingImages, resolveBookingImageUrls } from "./imageCache";

type Props = {
  open: boolean;
  title: string;
  imageRefs: string[];
  tenantId: string | null;
  initialIndex?: number;
  onClose: () => void;
  children?: React.ReactNode;
};

/** Крупнее превью, чем в карточке — fullscreen без мыла. */
const MODAL_IMAGE_SIZE = 1920;

export const BookingGalleryModal: React.FC<Props> = ({
  open,
  title,
  imageRefs,
  tenantId,
  initialIndex = 0,
  onClose,
  children,
}) => {
  const imageUrls = useMemo(
    () => resolveBookingImageUrls(imageRefs, tenantId, MODAL_IMAGE_SIZE),
    [imageRefs, tenantId]
  );

  useEffect(() => {
    if (!open || imageUrls.length === 0) return;
    void preloadBookingImages(imageUrls);
  }, [open, imageUrls]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="booking-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-gallery-title"
      onClick={onClose}
    >
      <div
        className="booking-modal-card booking-modal-card--gallery"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="booking-modal-close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <X size={20} strokeWidth={2} />
        </button>

        <div className="booking-modal-body">
          <BookingImageCarousel
            imageRefs={imageRefs}
            tenantId={tenantId}
            alt={title}
            variant="modal"
            preloadAll
            storageSize={MODAL_IMAGE_SIZE}
            previewSize={800}
            initialIndex={initialIndex}
          />

          <div className="booking-modal-details">
            <h4 id="booking-gallery-title" className="booking-modal-title">
              {title}
            </h4>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
