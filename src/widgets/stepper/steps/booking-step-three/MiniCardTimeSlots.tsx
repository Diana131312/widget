import React, { useEffect, useMemo, useState } from "react";
import { parseISO } from "date-fns";
import type { RoomTimeSlot, WidgetApiClient } from "../../../../api";
import { TimeSlots } from "../../calendar/TimeSlots";
import { loadRoomTimeSlots } from "../../calendar/slotsService";

export type MiniCardSlotPick = {
  timeFrom: string;
  timeTo: string;
  duration?: number;
  price: number;
  label: string;
};

type Props = {
  api: WidgetApiClient;
  roomId: string;
  roomName: string;
  dateStr: string;
  timeFrom?: string;
  timeTo?: string;
  onSlotPick: (slot: MiniCardSlotPick | null) => void;
};

function buildSlotLabel(slot: RoomTimeSlot): string {
  const comment = slot.comment?.trim();
  if (comment) return comment;
  return `${slot.timeFrom} — ${slot.timeTo}`;
}

export const MiniCardTimeSlots: React.FC<Props> = ({
  api,
  roomId,
  roomName,
  dateStr,
  timeFrom,
  timeTo,
  onSlotPick,
}) => {
  const [slots, setSlots] = useState<RoomTimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    loadRoomTimeSlots(api, roomId, dateStr)
      .then((data) => {
        if (cancelled) return;
        setSlots(data);
      })
      .catch(() => {
        if (cancelled) return;
        setHasError(true);
        setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, roomId, dateStr]);

  const selectedSlotIndex = useMemo(() => {
    if (!timeFrom || !timeTo) return null;
    const idx = slots.findIndex((s) => s.timeFrom === timeFrom && s.timeTo === timeTo);
    return idx >= 0 ? idx : null;
  }, [timeFrom, timeTo, slots]);

  const handleSlotClick = (slot: RoomTimeSlot, index: number) => {
    if (index < 0) {
      onSlotPick(null);
      return;
    }
    onSlotPick({
      timeFrom: slot.timeFrom,
      timeTo: slot.timeTo,
      duration: slot.duration,
      price: slot.price,
      label: buildSlotLabel(slot),
    });
  };

  return (
    <TimeSlots
      variant="miniCard"
      slots={slots}
      date={parseISO(dateStr)}
      roomName={roomName}
      roomId={roomId}
      isLoading={isLoading}
      hasError={hasError}
      selectedSlotIndex={selectedSlotIndex}
      onSlotClick={handleSlotClick}
    />
  );
};
