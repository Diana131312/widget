import React from "react";
import type { WidgetRoom } from "../../../api";

type Props = {
  open: boolean;
  room: WidgetRoom;
  onClose: () => void;
};

function formatGuestRange(room: WidgetRoom): string {
  const min = room.capacity ?? 1;
  const max = room.maxCapacity ?? min;
  return min === max ? `${max} человек` : `от ${min} до ${max} человек`;
}

export const BanyaTestInfoModal: React.FC<Props> = ({ open, room, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="widget-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="banya-test-info-title"
      onClick={onClose}
    >
      <div
        className="widget-modal-card widget-modal-card--wide daily-house-info-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="widget-modal-header">
          <h4 id="banya-test-info-title" className="widget-modal-title">
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
            {room.minDuration != null && room.minDuration > 0 && (
              <div className="daily-house-info-modal__detail">
                <dt>Мин. длительность</dt>
                <dd>{room.minDuration} ч.</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
};
