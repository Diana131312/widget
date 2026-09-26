import React, { useMemo } from "react";
import type { RoomTimeSlot } from "../../../api";

function formatTimeRange(timeFrom: string, timeTo: string): string {
  if (timeTo === "23:59") return `${timeFrom} — 24:00`;
  return `${timeFrom} — ${timeTo}`;
}

function formatDuration(hours: number): string {
  const n = Number.isFinite(hours) ? hours : 0;
  return `${n} ч`;
}

function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

type SlotGroup = {
  title: string;
  items: Array<{ slot: RoomTimeSlot; index: number }>;
};

/** Группы по comment с сервера (порядок первого появления). */
export function groupSlotsByComment(slots: RoomTimeSlot[]): SlotGroup[] {
  const map = new Map<string, SlotGroup>();
  slots.forEach((slot, index) => {
    const title = (slot.comment ?? "").trim() || "Стандарт";
    const existing = map.get(title);
    if (existing) {
      existing.items.push({ slot, index });
    } else {
      map.set(title, { title, items: [{ slot, index }] });
    }
  });
  return Array.from(map.values());
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
  const groups = useMemo(() => groupSlotsByComment(slots), [slots]);

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

  return (
    <div className="booking-slots__groups" aria-label="Слоты времени">
      {groups.map((group) => (
        <section key={group.title} className="booking-slots__group">
          <h5 className="booking-slots__group-title">{group.title}</h5>
          <ul className="booking-slots__list">
            {group.items.map(({ slot, index }) => {
              const available = slot.isAvailable === true;
              const selected = selectedIndex === index;
              return (
                <li key={`${slot.timeFrom}-${slot.timeTo}-${index}`}>
                  <button
                    type="button"
                    className={[
                      "booking-slots__item",
                      !available && "booking-slots__item--disabled",
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
                    <span className="booking-slots__time-row">
                      <span className="booking-slots__time">
                        {formatTimeRange(slot.timeFrom, slot.timeTo)}
                      </span>
                      <span className="booking-slots__duration">
                        {formatDuration(slot.duration)}
                      </span>
                    </span>
                    {slot.price > 0 ? (
                      <span className="booking-slots__price">
                        {formatRub(slot.price)} ₽
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};
