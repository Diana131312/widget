import React from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { BedDouble, CalendarRange, Clock, Users } from "lucide-react";
import type { WidgetApiClient } from "../../../../api";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import type { BookingFlowDraft, CategoryId } from "../../types";
import { formatDailyRangeLabel } from "../../daily/DailyRangeCalendar";
import { MiniCardTimeSlots, type MiniCardSlotPick } from "./MiniCardTimeSlots";

type Props = {
  categoryId: CategoryId;
  draft: BookingFlowDraft;
  maxGuests: number;
  guestCount: number;
  onGuestCountChange: (count: number) => void;
  api?: WidgetApiClient;
  onSlotPick?: (slot: MiniCardSlotPick | null) => void;
};

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMMM yyyy", { locale: ru });
  } catch {
    return dateStr;
  }
}

function formatTimeRange(timeFrom: string, timeTo: string): string {
  if (timeTo === "23:59") return `${timeFrom} — до 24:00`;
  return `${timeFrom} — ${timeTo}`;
}

export const BookingMiniCard: React.FC<Props> = ({
  categoryId,
  draft,
  maxGuests,
  guestCount,
  onGuestCountChange,
  api,
  onSlotPick,
}) => {
  const showCompactSlots =
    categoryId === "banyaTest" && Boolean(api && draft.date && draft.roomId && onSlotPick);

  return (
    <div className="booking-mini-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="booking-mini-card__header">
        {categoryId === "homes" ? (
          <CalendarRange size={18} className="text-[#485548]" aria-hidden />
        ) : (
          <BedDouble size={18} className="text-[#485548]" aria-hidden />
        )}
        <h4 className="booking-mini-card__title">{draft.roomName}</h4>
      </div>

      <div className="booking-mini-card__meta">
        {(categoryId === "banya" || categoryId === "banyaTest") && draft.date && (
          <p className="booking-mini-card__row">
            <CalendarRange size={16} aria-hidden />
            <span>{formatDate(draft.date)}</span>
          </p>
        )}
        {categoryId === "banya" && draft.timeFrom && draft.timeTo && (
          <p className="booking-mini-card__row">
            <Clock size={16} aria-hidden />
            <span>{formatTimeRange(draft.timeFrom, draft.timeTo)}</span>
          </p>
        )}
        {categoryId === "homes" && draft.checkInDate && draft.checkOutDate && (
          <p className="booking-mini-card__row">
            <CalendarRange size={16} aria-hidden />
            <span>
              {formatDailyRangeLabel(draft.checkInDate, draft.checkOutDate)}
            </span>
          </p>
        )}
      </div>

      {showCompactSlots && (
        <MiniCardTimeSlots
          api={api!}
          roomId={draft.roomId!}
          roomName={draft.roomName ?? ""}
          dateStr={draft.date!}
          timeFrom={draft.timeFrom}
          timeTo={draft.timeTo}
          onSlotPick={onSlotPick!}
        />
      )}

      <div className="booking-mini-card__guests">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Users size={18} aria-hidden />
          <span>Количество гостей</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onGuestCountChange(guestCount - 1)}
            disabled={guestCount <= 0}
            aria-label="Уменьшить количество гостей"
          >
            −
          </Button>
          <Badge
            variant="secondary"
            className={`min-w-10 justify-center tabular-nums ${
              guestCount === 0 ? "text-amber-700 bg-amber-50" : ""
            }`}
          >
            {guestCount}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onGuestCountChange(guestCount + 1)}
            disabled={guestCount >= maxGuests}
            aria-label="Увеличить количество гостей"
          >
            +
          </Button>
          <span className="text-xs text-slate-500">макс. {maxGuests}</span>
        </div>
        {guestCount === 0 && (
          <p className="mt-2 text-xs text-amber-800">Укажите количество гостей</p>
        )}
      </div>
    </div>
  );
};
