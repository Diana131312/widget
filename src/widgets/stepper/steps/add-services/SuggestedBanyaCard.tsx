import React, { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { CircleHelp, Users } from "lucide-react";
import type { RoomTimeSlot, WidgetRoom } from "../../../api";
import { HouseImageCarousel } from "../../daily/HouseImageCarousel";
import { BanyaTestInfoModal } from "../../banya-test/BanyaTestInfoModal";
import { buildSlotLabel, slotOptionKey } from "./crossSellService";

type Props = {
  room: WidgetRoom;
  tenantId: string | null;
  availableDates: string[];
  slotsByDate: Record<string, RoomTimeSlot[]>;
  onAdd: (pick: {
    date: string;
    slot: RoomTimeSlot;
  }) => void;
};

function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatGuestRange(room: WidgetRoom): string {
  const min = room.capacity ?? 1;
  const max = room.maxCapacity ?? min;
  return min === max ? String(max) : `${min} — ${max}`;
}

function formatDateLabel(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMMM yyyy", { locale: ru });
  } catch {
    return dateStr;
  }
}

function getPriceHint(room: WidgetRoom): string {
  const day = room.dayPrice;
  if (day != null && day > 0) return `от ${formatRub(day)} ₽ / час`;
  const night = room.nightPrice;
  if (night != null && night > 0) return `от ${formatRub(night)} ₽ / час`;
  return "Цена при выборе слота";
}

function formatSlotOption(slot: RoomTimeSlot): string {
  return `${slot.timeFrom} — ${slot.timeTo} · ${slot.duration} ч. · ${formatRub(slot.price)} ₽`;
}

export const SuggestedBanyaCard: React.FC<Props> = ({
  room,
  tenantId,
  availableDates,
  slotsByDate,
  onAdd,
}) => {
  const [infoOpen, setInfoOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlotKey, setSelectedSlotKey] = useState("");

  const availableDatesKey = availableDates.join(",");

  useEffect(() => {
    if (availableDates.length > 0) {
      setSelectedDate(availableDates[0]);
    } else {
      setSelectedDate("");
    }
  }, [room.id, availableDatesKey, availableDates]);

  const slotsForDate = useMemo(
    () => (selectedDate ? slotsByDate[selectedDate] ?? [] : []),
    [selectedDate, slotsByDate]
  );

  const slotsForDateKey = useMemo(
    () =>
      slotsForDate.map((s) => slotOptionKey(room.id, selectedDate, s)).join("|"),
    [slotsForDate, room.id, selectedDate]
  );

  useEffect(() => {
    if (slotsForDate.length > 0 && selectedDate) {
      setSelectedSlotKey(slotOptionKey(room.id, selectedDate, slotsForDate[0]));
    } else {
      setSelectedSlotKey("");
    }
  }, [room.id, selectedDate, slotsForDateKey]);

  const selectedSlot = useMemo(() => {
    if (!selectedSlotKey) return null;
    return (
      slotsForDate.find((s) => slotOptionKey(room.id, selectedDate, s) === selectedSlotKey) ??
      null
    );
  }, [selectedSlotKey, slotsForDate, room.id, selectedDate]);

  return (
    <>
      <article className="daily-house-card cross-sell-banya-card">
        <div className="daily-house-card__layout">
          <div className="daily-house-card__column daily-house-card__column--gallery">
            <HouseImageCarousel
              imageRefs={room.images ?? []}
              tenantId={tenantId}
              alt={room.name}
            />
          </div>

          <div className="daily-house-card__column daily-house-card__column--info">
            <div className="daily-house-card__name-row">
              <h4 className="daily-house-card__name">{room.name}</h4>
              <button
                type="button"
                className="daily-house-card__info-btn"
                onClick={() => setInfoOpen(true)}
                aria-label={`Подробнее о бане «${room.name}»`}
              >
                <CircleHelp size={20} strokeWidth={2} />
              </button>
            </div>

            <ul className="daily-house-card__features">
              <li className="daily-house-card__feature">
                <Users size={18} aria-hidden />
                <span>{formatGuestRange(room)} гостей</span>
              </li>
            </ul>

            <p className="daily-house-card__price-line">{getPriceHint(room)}</p>
            <p className="cross-sell-banya-card__hint">
              Даты в период вашего проживания в доме
            </p>
          </div>

          <div className="daily-house-card__column cross-sell-house-card__action cross-sell-banya-card__action">
            <div className="cross-sell-banya-card__pickers">
              <div className="cross-sell-banya-card__field">
                <label className="cross-sell-banya-card__label" htmlFor={`date-${room.id}`}>
                  Дата
                </label>
                <select
                  id={`date-${room.id}`}
                  className="cross-sell-banya-card__select"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                >
                  {availableDates.map((d) => (
                    <option key={d} value={d}>
                      {formatDateLabel(d)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cross-sell-banya-card__field">
                <label className="cross-sell-banya-card__label" htmlFor={`slot-${room.id}`}>
                  Время
                </label>
                <select
                  id={`slot-${room.id}`}
                  className="cross-sell-banya-card__select"
                  value={selectedSlotKey}
                  onChange={(e) => setSelectedSlotKey(e.target.value)}
                  disabled={slotsForDate.length === 0}
                >
                  {slotsForDate.map((slot) => {
                    const key = slotOptionKey(room.id, selectedDate, slot);
                    return (
                      <option key={key} value={key}>
                        {formatSlotOption(slot)}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="cross-sell-house-card__action-bottom">
              {selectedSlot && (
                <p className="cross-sell-house-card__price">
                  {formatRub(selectedSlot.price)} ₽
                </p>
              )}
              <button
                type="button"
                className="stepper-widget__btn stepper-widget__btn--primary daily-house-card__continue-btn"
                disabled={!selectedSlot}
                onClick={() => {
                  if (!selectedSlot || !selectedDate) return;
                  onAdd({ date: selectedDate, slot: selectedSlot });
                }}
              >
                Добавить в заказ
              </button>
            </div>
          </div>
        </div>
      </article>

      <BanyaTestInfoModal open={infoOpen} room={room} onClose={() => setInfoOpen(false)} />
    </>
  );
};
