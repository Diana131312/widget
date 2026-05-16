import React, { useEffect, useMemo } from "react";
import type { WidgetDailyRoom } from "../../../api";
import { HouseImageCarousel } from "./HouseImageCarousel";
import { preloadHouseImages, resolveHouseImageUrls } from "./houseImageCache";

type Props = {
  open: boolean;
  room: WidgetDailyRoom;
  tenantId: string | null;
  onClose: () => void;
};

const MODAL_IMAGE_SIZE = 600;

function formatGuestRange(room: WidgetDailyRoom): string {
  const min = room.capacity ?? 1;
  const max = room.maxCapacity ?? min;
  return min === max ? `${max} человек` : `от ${min} до ${max} человек`;
}

export const DailyHouseInfoModal: React.FC<Props> = ({
  open,
  room,
  tenantId,
  onClose,
}) => {
  const imageUrls = useMemo(
    () => resolveHouseImageUrls(room.images ?? [], tenantId, MODAL_IMAGE_SIZE),
    [room.images, tenantId]
  );

  useEffect(() => {
    if (!open || imageUrls.length === 0) return;
    preloadHouseImages(imageUrls);
  }, [open, imageUrls]);

  if (!open) return null;

  return (
    <div
      className="widget-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-house-info-title"
      onClick={onClose}
    >
      <div
        className="widget-modal-card daily-house-info-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="widget-modal-header">
          <h4 id="daily-house-info-title" className="widget-modal-title">
            {room.name}
          </h4>
          <button
            type="button"
            className="stepper-widget__btn stepper-widget__btn--ghost"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>

        <div className="widget-modal-body daily-house-info-modal__body">
          <HouseImageCarousel
            imageRefs={room.images ?? []}
            tenantId={tenantId}
            alt={room.name}
            variant="modal"
            preloadAll
            storageSize={MODAL_IMAGE_SIZE}
          />

          {room.description ? (
            <p className="daily-house-info-modal__description">{room.description}</p>
          ) : (
            <p className="daily-house-info-modal__description daily-house-info-modal__description--empty">
              Описание не указано.
            </p>
          )}

          <dl className="daily-house-info-modal__details">
            <div className="daily-house-info-modal__detail">
              <dt>Вместимость</dt>
              <dd>{formatGuestRange(room)}</dd>
            </div>
            <div className="daily-house-info-modal__detail">
              <dt>Время заезда</dt>
              <dd>{room.checkInTime || "—"}</dd>
            </div>
            <div className="daily-house-info-modal__detail">
              <dt>Время выезда</dt>
              <dd>{room.checkOutTime || "—"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};
