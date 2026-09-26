import React, { useState } from "react";
import { BookingGalleryModal } from "../media/GalleryModal";
import { BookingImageCarousel } from "../media/ImageCarousel";

export type BookingObjectCardProps = {
  name: string;
  imageRefs: string[];
  tenantId: string | null;
  /** Блок текста/фич под названием (разный для дома и бани) */
  infoSlot?: React.ReactNode;
  /** Календарь / слоты справа — настраивается снаружи */
  calendarSlot?: React.ReactNode;
  /** Нижняя зона под календарём (кнопка «Далее» и т.п.) */
  footerSlot?: React.ReactNode;
  /**
   * Полная замена body (например слайд инфо+календарь → слоты у бань).
   * Если задан — info/calendar/footer не рендерятся.
   */
  bodySlot?: React.ReactNode;
  /** Доп. контент внутри модалки галереи */
  galleryDetails?: React.ReactNode;
  className?: string;
};

/**
 * Общая карточка объекта: галерея + info + слот календаря.
 * Дом и баня отличаются слотами, не копией карточки.
 */
export const BookingObjectCard: React.FC<BookingObjectCardProps> = ({
  name,
  imageRefs,
  tenantId,
  infoSlot,
  calendarSlot,
  footerSlot,
  bodySlot,
  galleryDetails,
  className,
}) => {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  return (
    <>
      <article
        className={["booking-object-card", className].filter(Boolean).join(" ")}
      >
        <div className="booking-object-card__gallery">
          <BookingImageCarousel
            imageRefs={imageRefs}
            tenantId={tenantId}
            alt={name}
            onImageClick={(index) => {
              setGalleryIndex(index);
              setGalleryOpen(true);
            }}
          />
        </div>

        {bodySlot ? (
          <div className="booking-object-card__body booking-object-card__body--stage">
            {bodySlot}
          </div>
        ) : (
          <div className="booking-object-card__body">
            <div className="booking-object-card__info">
              <h4 className="booking-object-card__name">{name}</h4>
              {infoSlot}
            </div>

            {(calendarSlot || footerSlot) && (
              <div className="booking-object-card__side">
                {calendarSlot}
                {footerSlot}
              </div>
            )}
          </div>
        )}
      </article>

      <BookingGalleryModal
        open={galleryOpen}
        title={name}
        imageRefs={imageRefs}
        tenantId={tenantId}
        initialIndex={galleryIndex}
        onClose={() => setGalleryOpen(false)}
      >
        {galleryDetails}
      </BookingGalleryModal>
    </>
  );
};
