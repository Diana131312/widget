import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { CircleHelp, Users } from "lucide-react";
import type { WidgetDailyRoom } from "../../../api";
import { HouseImageCarousel } from "../../daily/HouseImageCarousel";
import { DailyHouseInfoModal } from "../../daily/DailyHouseInfoModal";
import { formatDailyRangeLabel } from "../../daily/DailyRangeCalendar";
import type { SuggestedHomeOffer } from "./crossSellService";

type Props = {
  offer: SuggestedHomeOffer;
  tenantId: string | null;
  onAdd: () => void;
};

function formatGuestRange(room: WidgetDailyRoom): string {
  const min = room.capacity ?? 1;
  const max = room.maxCapacity ?? min;
  return min === max ? String(max) : `${min} — ${max}`;
}

function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatBanyaHint(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMMM", { locale: ru });
  } catch {
    return dateStr;
  }
}

export const SuggestedHouseCard: React.FC<Props> = ({ offer, tenantId, onAdd }) => {
  const [infoOpen, setInfoOpen] = useState(false);
  const { room } = offer;
  const weekDayPrice = room.pricePeriod?.weekDayPrice ?? 0;

  return (
    <>
      <article className="daily-house-card cross-sell-house-card">
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
                aria-label={`Подробнее о доме «${room.name}»`}
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

            <p className="cross-sell-house-card__dates">
              {formatDailyRangeLabel(offer.checkIn, offer.checkOut)}
              <span className="cross-sell-house-card__hint">
                {" "}
                · к бане {formatBanyaHint(offer.relatedBanyaDate)}
              </span>
            </p>

            <p className="daily-house-card__price-line">
              от {formatRub(weekDayPrice)} ₽ / ночь
            </p>
          </div>

          <div className="daily-house-card__column cross-sell-house-card__action">
            <div className="cross-sell-house-card__action-top">
              <p className="cross-sell-house-card__price">
                {formatRub(offer.price)} ₽
              </p>
              <p className="cross-sell-house-card__nights">
                {offer.nights}{" "}
                {offer.nights === 1 ? "ночь" : offer.nights < 5 ? "ночи" : "ночей"}
              </p>
            </div>
            <div className="cross-sell-house-card__action-bottom">
              <button
                type="button"
                className="stepper-widget__btn stepper-widget__btn--primary daily-house-card__continue-btn"
                onClick={onAdd}
              >
                Добавить в заказ
              </button>
            </div>
          </div>
        </div>
      </article>

      <DailyHouseInfoModal
        open={infoOpen}
        room={room}
        tenantId={tenantId}
        onClose={() => setInfoOpen(false)}
      />
    </>
  );
};
