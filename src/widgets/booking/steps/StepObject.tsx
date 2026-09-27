import React, { useEffect, useMemo } from "react";
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
  /** Deep-link: показать только этот объект */
  focusRoomId?: string | null;
  showAllLabel?: string | null;
  onShowAll?: () => void;
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
    duration?: number;
    price?: number;
  }) => void;
};

/** API иногда отдаёт литеральный `\n` вместо перевода строки. */
function formatDescription(text: string): string {
  return text.replace(/\\n/g, "\n");
}

function HomeInfo({ room }: { room: WidgetDailyRoom }) {
  if (!room.description) return null;
  return (
    <p className="booking-object-card__desc">
      {formatDescription(room.description)}
    </p>
  );
}

function BanyaInfo({ room }: { room: WidgetRoom }) {
  if (!room.description) return null;
  return (
    <p className="booking-object-card__desc">
      {formatDescription(room.description)}
    </p>
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
  focusRoomId = null,
  showAllLabel = null,
  onShowAll,
  onSelectHome,
  onSelectBanya,
}) => {
  const api = useMemo(() => createWidgetApi({ alias: BOOKING_ALIAS }), []);
  const tenantId = config.settings?.tenantId ?? null;

  const homes = useMemo(() => {
    const list = (config.dailyRooms ?? []).filter((r) => r?.id && r?.name);
    if (!focusRoomId) return list;
    return list.filter((r) => r.id === focusRoomId);
  }, [config.dailyRooms, focusRoomId]);

  const baths = useMemo(() => {
    const list = (config.rooms ?? []).filter((r) => r?.id && r?.name);
    if (!focusRoomId) return list;
    return list.filter((r) => r.id === focusRoomId);
  }, [config.rooms, focusRoomId]);

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
              roomId={room.id}
              categoryId="homes"
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
              roomId={room.id}
              categoryId="banya"
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
                      onContinue={({
                        room: r,
                        date,
                        timeFrom,
                        timeTo,
                        duration,
                        price,
                      }) =>
                        onSelectBanya({
                          roomId: r.id,
                          date,
                          timeFrom,
                          timeTo,
                          duration,
                          price,
                        })
                      }
                    />
                  )}
                </LazyOccupancy>
              }
              galleryDetails={null}
            />
          ))}

      {showAllLabel && onShowAll ? (
        <div className="booking-object-list__show-all-wrap">
          <button
            type="button"
            className="booking-object-list__show-all"
            onClick={onShowAll}
          >
            <span aria-hidden>←</span> {showAllLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
};
