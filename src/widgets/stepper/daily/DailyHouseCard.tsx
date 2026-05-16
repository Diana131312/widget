import React, { useCallback, useEffect, useState } from "react";
import { startOfMonth } from "date-fns";
import { BedDouble, CircleHelp, Sofa, Users } from "lucide-react";
import type { WidgetApiClient, WidgetDailyRoom } from "../../../api";
import { HouseImageCarousel } from "./HouseImageCarousel";
import { DailyRangeCalendar } from "./DailyRangeCalendar";
import { DailyHouseInfoModal } from "./DailyHouseInfoModal";
import type { DailyDateRange } from "./dailyTypes";
import {
  expandOccupiedNights,
  loadDailyOccupied,
} from "./dailyOccupiedService";

export type DailyHouseCardProps = {
  room: WidgetDailyRoom;
  api: WidgetApiClient;
  tenantId: string | null;
  onContinue?: (payload: {
    room: WidgetDailyRoom;
    range: DailyDateRange;
  }) => void;
};

function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatGuestRange(room: WidgetDailyRoom): string {
  const min = room.capacity ?? 1;
  const max = room.maxCapacity ?? min;
  return min === max ? String(max) : `${min} — ${max}`;
}

export const DailyHouseCard: React.FC<DailyHouseCardProps> = ({
  room,
  api,
  tenantId,
  onContinue,
}) => {
  const [anchorMonth, setAnchorMonth] = useState(() => startOfMonth(new Date()));
  const [occupiedNights, setOccupiedNights] = useState<Set<string>>(() => new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DailyDateRange | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const weekDayPrice = room.pricePeriod?.weekDayPrice ?? 0;
  const weekEndPrice = room.pricePeriod?.weekEndPrice ?? 0;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    loadDailyOccupied(api, room.id, anchorMonth)
      .then((ranges) => {
        if (cancelled) return;
        setOccupiedNights(expandOccupiedNights(ranges));
      })
      .catch(() => {
        if (cancelled) return;
        setHasError(true);
        setOccupiedNights(new Set());
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, room.id, anchorMonth]);

  const handleMonthChange = useCallback((monthStart: Date) => {
    setAnchorMonth(monthStart);
  }, []);

  const handleRangeChange = useCallback((range: DailyDateRange | null) => {
    setSelectedRange(range);
  }, []);

  const handleContinue = () => {
    if (!selectedRange) return;
    onContinue?.({ room, range: selectedRange });
  };

  return (
    <>
      <article className="daily-house-card">
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
              <li className="daily-house-card__feature">
                <BedDouble size={18} aria-hidden />
                <span>2 односпальные кровати</span>
              </li>
              <li className="daily-house-card__feature">
                <Sofa size={18} aria-hidden />
                <span>1 диван</span>
              </li>
            </ul>

            <div className="daily-house-card__prices">
              <p className="daily-house-card__price-line">
                Обычные дни: от {formatRub(weekDayPrice)} ₽
              </p>
              <p className="daily-house-card__price-line daily-house-card__price-line--holiday">
                Праздничные: от {formatRub(weekEndPrice)} ₽
              </p>
            </div>
          </div>

          <div className="daily-house-card__column daily-house-card__column--calendar">
            <DailyRangeCalendar
              occupiedNights={occupiedNights}
              isLoading={isLoading}
              hasError={hasError}
              onMonthChange={handleMonthChange}
              onRangeChange={handleRangeChange}
            />

            <button
              type="button"
              className="stepper-widget__btn stepper-widget__btn--primary daily-house-card__continue-btn"
              disabled={!selectedRange || isLoading}
              onClick={handleContinue}
            >
              Далее →
            </button>
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
