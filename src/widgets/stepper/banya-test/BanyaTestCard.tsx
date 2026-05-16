import React, { useState } from "react";
import { CircleHelp, Users } from "lucide-react";
import type { WidgetApiClient, WidgetRoom } from "../../../api";
import { HouseImageCarousel } from "../daily/HouseImageCarousel";
import { BanyaHourlyCalendar } from "./BanyaHourlyCalendar";
import { BanyaTestInfoModal } from "./BanyaTestInfoModal";

export type BanyaTestCardProps = {
  room: WidgetRoom;
  api: WidgetApiClient;
  tenantId: string | null;
  onContinue?: (payload: { room: WidgetRoom; date: string }) => void;
};

function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatGuestRange(room: WidgetRoom): string {
  const min = room.capacity ?? 1;
  const max = room.maxCapacity ?? min;
  return min === max ? String(max) : `${min} — ${max}`;
}

function getPriceHint(room: WidgetRoom): string {
  const day = room.dayPrice;
  if (day != null && day > 0) return `от ${formatRub(day)} ₽ / час`;
  const night = room.nightPrice;
  if (night != null && night > 0) return `от ${formatRub(night)} ₽ / час (ночь)`;
  return "Цена уточняется при выборе времени";
}

export const BanyaTestCard: React.FC<BanyaTestCardProps> = ({
  room,
  api,
  tenantId,
  onContinue,
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const handleContinue = () => {
    if (!selectedDate) return;
    onContinue?.({ room, date: selectedDate });
  };

  return (
    <>
      <article className="daily-house-card banya-test-card">
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
          </div>

          <div className="daily-house-card__column daily-house-card__column--calendar banya-test-card__calendar">
            <BanyaHourlyCalendar
              roomId={room.id}
              roomName={room.name}
              api={api}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />

            <button
              type="button"
              className="stepper-widget__btn stepper-widget__btn--primary daily-house-card__continue-btn"
              disabled={!selectedDate}
              onClick={handleContinue}
            >
              Далее →
            </button>
          </div>
        </div>
      </article>

      <BanyaTestInfoModal open={infoOpen} room={room} onClose={() => setInfoOpen(false)} />
    </>
  );
};
