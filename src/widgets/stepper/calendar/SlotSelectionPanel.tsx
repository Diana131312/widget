import React from "react";
import type { RoomTimeSlot } from "../../../api";

type Props = {
  selectedSlot: RoomTimeSlot;
  guestCount: number;
  maxGuests: number;
  onGuestCountChange: (count: number) => void;
  onContinue: () => void;
};

/**
 * Форматирует время для отображения
 * Если timeTo = "23:59", отображает "до 24:00"
 */
function formatTimeRange(timeFrom: string, timeTo: string): string {
  if (timeTo === "23:59") {
    return `${timeFrom} - до 24:00`;
  }
  return `${timeFrom} - ${timeTo}`;
}

/**
 * Нижняя панель выбора гостей и продолжения бронирования
 */
export const SlotSelectionPanel: React.FC<Props> = ({
  selectedSlot,
  guestCount,
  maxGuests,
  onGuestCountChange,
  onContinue,
}) => {
  const canDecrease = guestCount > 1;
  const canIncrease = guestCount < maxGuests;

  const handleDecrease = () => {
    if (canDecrease) {
      onGuestCountChange(guestCount - 1);
    }
  };

  const handleIncrease = () => {
    if (canIncrease) {
      onGuestCountChange(guestCount + 1);
    }
  };

  return (
    <div className="stepper-slots-panel">
      <div className="stepper-slots-panel__content">
        {/* Информация о выбранном слоте */}
        <div className="stepper-slots-panel__slot-info">
          <div className="stepper-slots-panel__slot-time">
            {formatTimeRange(selectedSlot.timeFrom, selectedSlot.timeTo)}
          </div>
          <div className="stepper-slots-panel__slot-price">
            {selectedSlot.price.toLocaleString("ru-RU")} ₽
          </div>
        </div>

        {/* Выбор количества гостей */}
        <div className="stepper-slots-panel__guests">
          <span className="stepper-slots-panel__guests-label">Гостей:</span>
          <div className="stepper-slots-panel__guests-controls">
            <button
              type="button"
              className="stepper-slots-panel__guests-btn"
              onClick={handleDecrease}
              disabled={!canDecrease}
              aria-label="Уменьшить количество гостей"
            >
              −
            </button>
            <span className="stepper-slots-panel__guests-count">{guestCount}</span>
            <button
              type="button"
              className="stepper-slots-panel__guests-btn"
              onClick={handleIncrease}
              disabled={!canIncrease}
              aria-label="Увеличить количество гостей"
            >
              +
            </button>
          </div>
          <span className="stepper-slots-panel__guests-max">
            (макс. {maxGuests})
          </span>
        </div>

        {/* Кнопка "Продолжить" */}
        <button
          type="button"
          className="stepper-slots-panel__continue-btn"
          onClick={onContinue}
        >
          Продолжить
        </button>
      </div>
    </div>
  );
};
