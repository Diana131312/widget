import React, { useEffect, useMemo, useState } from "react";
import type { RoomTimeSlot } from "../../../api";
import {
  groupItemsByComment,
  splitPromoHourGiftSlots,
  type SlotGroupItem,
} from "./banyaSlotVariants";

function formatTimeEnd(timeTo: string): string {
  if (timeTo === "23:59") return "24:00";
  return timeTo;
}

function formatDuration(hours: number): string {
  const n = Number.isFinite(hours) ? hours : 0;
  return `${n} ч`;
}

function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function SlotItemButton({
  slot,
  index,
  selected,
  onSelect,
}: {
  slot: RoomTimeSlot;
  index: number;
  selected: boolean;
  onSelect: (slot: RoomTimeSlot, index: number) => void;
}) {
  const available = slot.isAvailable === true;
  return (
    <button
      type="button"
      className={[
        "booking-slots__item",
        available && "booking-slots__item--free",
        !available && "booking-slots__item--busy",
        available && selected && "booking-slots__item--selected",
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={!available}
      aria-pressed={selected}
      onClick={() => {
        if (!available) return;
        onSelect(slot, index);
      }}
    >
      <span className="booking-slots__item-main">
        <span className="booking-slots__time">
          {slot.timeFrom} – {formatTimeEnd(slot.timeTo)}
        </span>
        <span className="booking-slots__duration">
          {formatDuration(slot.duration)}
        </span>
      </span>
      {slot.price > 0 ? (
        <span className="booking-slots__price">{formatRub(slot.price)} ₽</span>
      ) : (
        <span className="booking-slots__price booking-slots__price--empty" />
      )}
    </button>
  );
}

function SlotList({
  items,
  selectedIndex,
  onSelect,
}: {
  items: SlotGroupItem[];
  selectedIndex: number | null;
  onSelect: (slot: RoomTimeSlot, index: number) => void;
}) {
  return (
    <ul className="booking-slots__list">
      {items.map(({ slot, index }) => (
        <li key={`${slot.timeFrom}-${slot.timeTo}-${index}`}>
          <SlotItemButton
            slot={slot}
            index={index}
            selected={selectedIndex === index}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  );
}

type Props = {
  slots: RoomTimeSlot[];
  isLoading?: boolean;
  hasError?: boolean;
  selectedIndex: number | null;
  onSelect: (slot: RoomTimeSlot, index: number) => void;
  onRetry?: () => void;
};

export const BanyaTimeSlots: React.FC<Props> = ({
  slots,
  isLoading = false,
  hasError = false,
  selectedIndex,
  onSelect,
  onRetry,
}) => {
  const [showOthers, setShowOthers] = useState(false);

  const promoSplit = useMemo(() => splitPromoHourGiftSlots(slots), [slots]);

  // Сброс «показать другие» при смене набора слотов (другая дата).
  const slotsKey = useMemo(
    () => slots.map((s) => `${s.timeFrom}-${s.timeTo}-${s.comment}`).join("|"),
    [slots]
  );
  useEffect(() => {
    setShowOthers(false);
  }, [slotsKey]);

  if (isLoading) {
    return (
      <div
        className="booking-slots__state booking-slots__state--loading"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="booking-slots__spinner" aria-hidden />
        <p className="booking-slots__state-title">Загрузка слотов</p>
        <p className="booking-slots__state-detail">
          Подбираем свободное время на выбранную дату
        </p>
        <ul className="booking-slots__skeleton" aria-hidden>
          <li className="booking-slots__skeleton-item" />
          <li className="booking-slots__skeleton-item" />
          <li className="booking-slots__skeleton-item" />
        </ul>
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        className="booking-slots__state booking-slots__state--error"
        role="alert"
      >
        <p className="booking-slots__state-title">
          Не удалось загрузить слоты
        </p>
        <p className="booking-slots__state-detail">
          Проверьте соединение и попробуйте ещё раз
        </p>
        {onRetry ? (
          <button
            type="button"
            className="booking-slots__retry"
            onClick={onRetry}
          >
            Повторить
          </button>
        ) : null}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="booking-slots__state" role="status">
        <p className="booking-slots__state-title">Нет свободных слотов</p>
        <p className="booking-slots__state-detail">
          Выберите другую дату в календаре
        </p>
      </div>
    );
  }

  const hasPromo = promoSplit.promo.length > 0;
  const hasOthers = promoSplit.others.length > 0;
  const primary = hasPromo ? promoSplit.promo : promoSplit.others;
  const primaryTitle = hasPromo
    ? 'Акция "ЧАС В ПОДАРОК"'
    : "Другие слоты";
  const otherGroups = hasPromo
    ? groupItemsByComment(promoSplit.others)
    : [];

  return (
    <div className="booking-slots__groups" aria-label="Слоты времени">
      <section className="booking-slots__group booking-slots__group--static">
        <h5 className="booking-slots__group-title">{primaryTitle}</h5>
        <SlotList
          items={primary}
          selectedIndex={selectedIndex}
          onSelect={onSelect}
        />
      </section>

      {hasPromo && hasOthers && !showOthers ? (
        <button
          type="button"
          className="booking-slots__more"
          onClick={() => setShowOthers(true)}
        >
          Показать все слоты
        </button>
      ) : null}

      {hasPromo && hasOthers && showOthers
        ? otherGroups.map((group) => (
            <section
              key={group.title}
              className="booking-slots__group booking-slots__group--static"
            >
              <h5 className="booking-slots__group-title">{group.title}</h5>
              <SlotList
                items={group.items}
                selectedIndex={selectedIndex}
                onSelect={onSelect}
              />
            </section>
          ))
        : null}
    </div>
  );
};

// Re-export for existing tests / callers
export { groupSlotsByComment } from "./banyaSlotVariants";
