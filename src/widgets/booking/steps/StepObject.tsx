import React, { useEffect, useMemo } from "react";
import { Clock, Users } from "lucide-react";
import { createWidgetApi } from "../../../api";
import type { WidgetDailyRoom, WidgetGetResponse, WidgetRoom } from "../../../api";
import { BanyaCalendarPanel } from "../calendar/BanyaCalendarPanel";
import { HomeCalendarPanel } from "../calendar/HomeCalendarPanel";
import { BookingObjectCard } from "../cards/ObjectCard";
import { BOOKING_ALIAS } from "../constants";
import { useNearViewport } from "../hooks/useNearViewport";
import {
  preloadBookingImages,
  resolveBookingImageUrls,
} from "../media/imageCache";
import type { BookingCategoryId } from "../types";

type StepObjectProps = {
  categoryId: BookingCategoryId;
  config: WidgetGetResponse;
  onSelectHome: (payload: {
    roomId: string;
    checkIn: string;
    checkOut: string;
  }) => void;
  onSelectBanya: (payload: {
    roomId: string;
    date: string;
    timeFrom: string;
    timeTo: string;
  }) => void;
};

function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatGuestRange(min?: number | null, max?: number | null): string {
  const a = min ?? 1;
  const b = max ?? a;
  return a === b ? String(b) : `${a} — ${b}`;
}

/** API иногда отдаёт литеральный `\n` вместо перевода строки. */
function formatDescription(text: string): string {
  return text.replace(/\\n/g, "\n");
}

function HomeInfo({ room }: { room: WidgetDailyRoom }) {
  const weekDay = room.pricePeriod?.weekDayPrice ?? 0;
  const weekEnd = room.pricePeriod?.weekEndPrice ?? 0;
  const checkIn = room.checkInTime?.trim();
  const checkOut = room.checkOutTime?.trim();
  return (
    <>
      <ul className="booking-object-card__features">
        <li className="booking-object-card__feature">
          <Users size={18} aria-hidden />
          <span>{formatGuestRange(room.capacity, room.maxCapacity)} гостей</span>
        </li>
        {(checkIn || checkOut) && (
          <li className="booking-object-card__feature">
            <Clock size={18} aria-hidden />
            <span>
              Заезд {checkIn || "—"} · Выезд {checkOut || "—"}
            </span>
          </li>
        )}
      </ul>
      <div className="booking-object-card__prices">
        <p className="booking-object-card__price">
          Обычные дни: от {formatRub(weekDay)} ₽
        </p>
        <p className="booking-object-card__price booking-object-card__price--accent">
          Праздничные: от {formatRub(weekEnd)} ₽
        </p>
      </div>
      {room.description ? (
        <p className="booking-object-card__desc">
          {formatDescription(room.description)}
        </p>
      ) : null}
    </>
  );
}

function BanyaInfo({ room }: { room: WidgetRoom }) {
  const day = room.dayPrice;
  const night = room.nightPrice;
  let price: string | null = null;
  if (day != null && day > 0) price = `от ${formatRub(day)} ₽ / час`;
  else if (night != null && night > 0)
    price = `от ${formatRub(night)} ₽ / час (ночь)`;

  return (
    <>
      <ul className="booking-object-card__features">
        <li className="booking-object-card__feature">
          <Users size={18} aria-hidden />
          <span>{formatGuestRange(room.capacity, room.maxCapacity)} гостей</span>
        </li>
      </ul>
      {price ? <p className="booking-object-card__price">{price}</p> : null}
      {room.description ? (
        <p className="booking-object-card__desc">
          {formatDescription(room.description)}
        </p>
      ) : null}
    </>
  );
}

/** Грузит occupancy только когда карточка близко к viewport. */
function LazyOccupancy({
  children,
}: {
  children: (enabled: boolean) => React.ReactNode;
}) {
  const { ref, visible } = useNearViewport("200px");
  return <div ref={ref}>{children(visible)}</div>;
}

export const StepObject: React.FC<StepObjectProps> = ({
  categoryId,
  config,
  onSelectHome,
  onSelectBanya,
}) => {
  const api = useMemo(() => createWidgetApi({ alias: BOOKING_ALIAS }), []);
  const tenantId = config.settings?.tenantId ?? null;

  const homes = useMemo(
    () => (config.dailyRooms ?? []).filter((r) => r?.id && r?.name),
    [config.dailyRooms]
  );

  const baths = useMemo(
    () => (config.rooms ?? []).filter((r) => r?.id && r?.name),
    [config.rooms]
  );

  const items = categoryId === "homes" ? homes : baths;

  useEffect(() => {
    const refs = items.flatMap((r) => r.images ?? []);
    const urls = resolveBookingImageUrls(refs, tenantId, 800);
    void preloadBookingImages(urls);
  }, [items, tenantId]);

  if (items.length === 0) {
    return (
      <p className="booking-header__step">
        Нет доступных {categoryId === "homes" ? "домов" : "бань"} для
        бронирования.
      </p>
    );
  }

  return (
    <div className="booking-object-list" aria-label="Выбор объекта">
      {categoryId === "homes"
        ? homes.map((room) => (
            <BookingObjectCard
              key={room.id}
              name={room.name}
              imageRefs={room.images ?? []}
              tenantId={tenantId}
              infoSlot={<HomeInfo room={room} />}
              calendarSlot={
                <LazyOccupancy>
                  {(enabled) => (
                    <HomeCalendarPanel
                      room={room}
                      api={api}
                      enabled={enabled}
                      onContinue={({ room: r, range }) =>
                        onSelectHome({
                          roomId: r.id,
                          checkIn: range.checkIn,
                          checkOut: range.checkOut,
                        })
                      }
                    />
                  )}
                </LazyOccupancy>
              }
              galleryDetails={null}
            />
          ))
        : baths.map((room) => (
            <BookingObjectCard
              key={room.id}
              name={room.name}
              imageRefs={room.images ?? []}
              tenantId={tenantId}
              bodySlot={
                <LazyOccupancy>
                  {(enabled) => (
                    <BanyaCalendarPanel
                      room={room}
                      api={api}
                      enabled={enabled}
                      roomName={room.name}
                      infoSlot={<BanyaInfo room={room} />}
                      onContinue={({ room: r, date, timeFrom, timeTo }) =>
                        onSelectBanya({
                          roomId: r.id,
                          date,
                          timeFrom,
                          timeTo,
                        })
                      }
                    />
                  )}
                </LazyOccupancy>
              }
              galleryDetails={null}
            />
          ))}
    </div>
  );
};
