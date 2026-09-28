import React, { useEffect, useMemo, useState } from "react";
import { format, parseISO, startOfMonth } from "date-fns";
import type { RoomTimeSlot, WidgetApiClient, WidgetRoom } from "../../../api";
import { useBookingToast } from "../ui/ToastContext";
import { RoomNameWithCopy } from "../ui/RoomNameWithCopy";
import { MonthlyCalendar } from "./MonthlyCalendar";
import { BanyaTimeSlots } from "./BanyaTimeSlots";
import {
  convertToMonthlyOccupancyData,
  loadMonthlyAvailabilityForRoom,
  loadRoomTimeSlots,
  type MonthlyOccupancyData,
} from "./services";

export type BanyaContinuePayload = {
  room: WidgetRoom;
  date: string;
  timeFrom: string;
  timeTo: string;
  price: number;
  duration: number;
};

type Props = {
  room: WidgetRoom;
  api: WidgetApiClient;
  /** Левая колонка (фичи / цена) — уезжает вместе с календарём */
  infoSlot: React.ReactNode;
  roomName: string;
  /** false — не грузить occupancy (карточка вне viewport). */
  enabled?: boolean;
  onContinue?: (payload: BanyaContinuePayload) => void;
};

/**
 * Календарь бани + слоты под календарём.
 */
export const BanyaCalendarPanel: React.FC<Props> = ({
  room,
  api,
  infoSlot,
  roomName,
  enabled = true,
  onContinue,
}) => {
  const { showToast } = useBookingToast();

  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));
  const [monthlyData, setMonthlyData] = useState<MonthlyOccupancyData>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slotsOpen, setSlotsOpen] = useState(false);
  const [slots, setSlots] = useState<RoomTimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const [slotsReloadToken, setSlotsReloadToken] = useState(0);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (!enabled) {
      setIsLoading(true);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    loadMonthlyAvailabilityForRoom(api, room.id, monthStart)
      .then((response) => {
        if (cancelled) return;
        setMonthlyData(convertToMonthlyOccupancyData(monthStart, response));
      })
      .catch(() => {
        if (cancelled) return;
        setHasError(true);
        setMonthlyData([]);
        showToast("Не удалось загрузить занятость бани. Попробуйте позже.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, api, room.id, monthStart, reloadToken, showToast]);

  useEffect(() => {
    if (!selectedDate || !slotsOpen) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(false);
    setSlots([]);
    setSelectedSlotIndex(null);

    loadRoomTimeSlots(api, room.id, selectedDate)
      .then((next) => {
        if (cancelled) return;
        setSlots(next);
      })
      .catch(() => {
        if (cancelled) return;
        setSlotsError(true);
        setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, room.id, selectedDate, slotsOpen, slotsReloadToken]);

  const selectedDateObj = useMemo(() => {
    if (!selectedDate) return null;
    try {
      return parseISO(selectedDate);
    } catch {
      return null;
    }
  }, [selectedDate]);

  const selectedSlot =
    selectedSlotIndex != null ? slots[selectedSlotIndex] ?? null : null;

  const handleDateClick = (date: Date) => {
    if (hasError || isLoading) return;
    const dateStr = format(date, "yyyy-MM-dd");
    setSelectedDate(dateStr);
    setSelectedSlotIndex(null);
    setSlotsOpen(true);
  };

  const handleRetryOccupancy = () => {
    setReloadToken((n) => n + 1);
  };

  const handleRetrySlots = () => {
    setSlotsReloadToken((n) => n + 1);
  };

  const slotsPanel = slotsOpen ? (
    <div className="booking-slots">
      <BanyaTimeSlots
        slots={slots}
        isLoading={slotsLoading}
        hasError={slotsError}
        selectedIndex={selectedSlotIndex}
        onSelect={(_slot, index) => setSelectedSlotIndex(index)}
        onRetry={handleRetrySlots}
      />

      <button
        type="button"
        className="booking-cal__continue"
        disabled={!selectedDate || !selectedSlot}
        onClick={() => {
          if (!selectedDate || !selectedSlot) return;
          onContinue?.({
            room,
            date: selectedDate,
            timeFrom: selectedSlot.timeFrom,
            timeTo: selectedSlot.timeTo,
            price: selectedSlot.price,
            duration: selectedSlot.duration,
          });
        }}
      >
        Далее →
      </button>
    </div>
  ) : null;

  return (
    <div
      className={[
        "booking-banya-stage",
        "booking-banya-stage--below",
        slotsOpen && "booking-banya-stage--slots",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="booking-banya-stage__track">
        <div className="booking-banya-stage__panel booking-banya-stage__panel--main">
          <div className="booking-object-card__info">
            <RoomNameWithCopy
              name={roomName}
              roomId={room.id}
              categoryId="banya"
            />
            {infoSlot}
          </div>
          <div className="booking-object-card__side">
            <div className="booking-cal-panel">
              <MonthlyCalendar
                data={monthlyData}
                initialDate={monthStart}
                onMonthChange={setMonthStart}
                isLoading={isLoading}
                hasError={hasError}
                selectedDate={selectedDateObj}
                onDateClick={handleDateClick}
                onRetry={handleRetryOccupancy}
              />
            </div>
          </div>
        </div>

        {slotsOpen && (
          <div className="booking-banya-stage__panel booking-banya-stage__panel--slots">
            {slotsPanel}
          </div>
        )}
      </div>
    </div>
  );
};
