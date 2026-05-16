import React, { useMemo } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { RoomTimeSlot } from "../../../api";
import { cn } from "../../../lib/utils";

export type TimeSlotsVariant = "default" | "miniCard";

type Props = {
  slots: RoomTimeSlot[];
  date: Date;
  roomName: string;
  roomId?: string;
  isLoading?: boolean;
  hasError?: boolean;
  selectedSlotIndex?: number | null;
  onSlotClick?: (slot: RoomTimeSlot, index: number) => void;
  variant?: TimeSlotsVariant;
};

type SlotGroup = {
  title: string;
  slots: RoomTimeSlot[];
};

function formatTimeRange(timeFrom: string, timeTo: string): string {
  if (timeTo === "23:59") return `${timeFrom} — 24:00`;
  return `${timeFrom} — ${timeTo}`;
}

function getGroupSubtitle(title: string): string {
  const normalized = title.toLowerCase();
  if (normalized.includes("подар")) return "Забронируйте время и получите дополнительный час";
  if (normalized.includes("скидк")) return "6 часов отдыха по специальной цене";
  if (normalized.includes("стандарт")) return "Обычное бронирование без акций";
  return "Выберите подходящий слот";
}

function getOldPrice(slot: RoomTimeSlot, groupTitle: string): number | null {
  const normalized = groupTitle.toLowerCase();

  if (normalized.includes("подар")) {
    const duration = slot.duration || 1;
    if (duration <= 1) return null;
    const pricePerHourOld = slot.price / (duration - 1);
    return Math.round(pricePerHourOld * duration);
  }

  if (normalized.includes("скидк")) {
    return Math.round(slot.price / 0.8);
  }

  return null;
}

function groupSlots(slots: RoomTimeSlot[]): SlotGroup[] {
  const groupsMap = new Map<string, RoomTimeSlot[]>();

  slots.forEach((slot) => {
    const comment = slot.comment || "";
    const groupKey = comment || "Без комментария";

    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, []);
    }
    groupsMap.get(groupKey)!.push(slot);
  });

  return Array.from(groupsMap.entries()).map(([title, groupSlots]) => ({
    title,
    slots: groupSlots,
  }));
}

function slotGroupGridClass(slotCount: number, variant: TimeSlotsVariant): string {
  let grid = "grid grid-cols-2 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4";
  if (slotCount === 3) {
    grid = "grid grid-cols-2 items-stretch gap-3 lg:grid-cols-3";
  } else if (slotCount === 4) {
    grid = "grid grid-cols-2 items-stretch gap-3 lg:grid-cols-4";
  }
  if (variant === "miniCard") {
    return `booking-mini-card__slots-grid ${grid}`;
  }
  return grid;
}

type SlotButtonProps = {
  slot: RoomTimeSlot;
  groupTitle: string;
  isSelected: boolean;
  variant: TimeSlotsVariant;
  onClick: () => void;
};

const SlotButton: React.FC<SlotButtonProps> = ({
  slot,
  groupTitle,
  isSelected,
  variant,
  onClick,
}) => {
  const isAvailable = slot.isAvailable === true;
  const oldPrice = getOldPrice(slot, groupTitle);
  const isGift = groupTitle.toLowerCase().includes("подар");
  if (variant === "miniCard") {
    return (
      <button
        type="button"
        disabled={!isAvailable}
        onClick={() => {
          if (!isAvailable) return;
          onClick();
        }}
        className={cn(
          "booking-mini-card__slot",
          !isAvailable && "booking-mini-card__slot--disabled",
          isAvailable && isSelected && "booking-mini-card__slot--selected"
        )}
      >
        <div className="booking-mini-card__slot-body">
          <div className="booking-mini-card__slot-time">
            {formatTimeRange(slot.timeFrom, slot.timeTo)}
          </div>
          <div className="booking-mini-card__slot-duration">
            {slot.duration} ч.
            {isGift && ` (акция ${slot.duration} = ${slot.duration - 1})`}
          </div>
        </div>

        <div className="booking-mini-card__slot-prices">
          {oldPrice != null && (
            <span className="booking-mini-card__slot-old-price">
              {oldPrice.toLocaleString("ru-RU")} ₽
            </span>
          )}
          <span className="booking-mini-card__slot-price">
            {slot.price.toLocaleString("ru-RU")} ₽
          </span>
        </div>

        {isSelected && isAvailable && (
          <span className="booking-mini-card__slot-check" aria-hidden>
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}

        {!isAvailable && <span className="booking-mini-card__slot-unavailable" aria-hidden />}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={!isAvailable}
      onClick={() => {
        if (!isAvailable) return;
        onClick();
      }}
      className={cn(
        "relative flex h-full flex-col rounded-xl border p-3 text-left transition-all",
        !isAvailable && "cursor-not-allowed border-gray-200 bg-gray-50 opacity-40",
        isAvailable &&
          (isSelected
            ? "border-2 border-[#485548] bg-white shadow-md"
            : "border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm")
      )}
    >
      <div className="mb-3 min-w-0 flex-1">
        <div className="mb-1 text-base font-semibold text-gray-800 sm:text-lg">
          {formatTimeRange(slot.timeFrom, slot.timeTo)}
        </div>
        <div className="text-sm text-gray-500">
          {slot.duration} ч.
          {isGift && ` (акция ${slot.duration} = ${slot.duration - 1})`}
        </div>
      </div>

      <div className="mt-auto border-t border-gray-100 pt-2">
        <div className="flex w-full min-w-0 flex-wrap items-end justify-end gap-x-2 gap-y-0.5">
          {oldPrice != null && (
            <span className="text-right text-sm tabular-nums text-gray-400 line-through">
              {oldPrice.toLocaleString("ru-RU")} ₽
            </span>
          )}
          <span className="text-right text-base font-medium tabular-nums text-gray-600">
            {slot.price.toLocaleString("ru-RU")} ₽
          </span>
        </div>
      </div>

      {isSelected && isAvailable && (
        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#485548]">
          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {!isAvailable && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-xl"
          style={{ background: "rgb(55 55 55 / 0.2)" }}
        />
      )}
    </button>
  );
};

export const TimeSlots: React.FC<Props> = ({
  slots,
  date,
  roomName,
  roomId: _roomId,
  isLoading = false,
  hasError = false,
  selectedSlotIndex = null,
  onSlotClick,
  variant = "default",
}) => {
  const dateStr = format(date, "d MMMM yyyy", { locale: ru });
  const isMiniCard = variant === "miniCard";

  const groupedSlots = useMemo(() => groupSlots(slots), [slots]);

  const getSlotIndex = (slot: RoomTimeSlot): number => {
    return slots.findIndex(
      (s) =>
        s.timeFrom === slot.timeFrom &&
        s.timeTo === slot.timeTo &&
        s.duration === slot.duration
    );
  };

  if (isLoading) {
    if (isMiniCard) {
      return (
        <div className="booking-mini-card__slots">
          <p className="booking-mini-card__slots-label">Время</p>
          <div className="booking-mini-card__slots-skeleton" aria-hidden />
        </div>
      );
    }
    return (
      <div className="mt-4 space-y-4">
        <div className="space-y-1">
          <h3 className="text-2xl font-semibold tracking-tight text-[#485548]">Доступное время</h3>
          <p className="text-sm text-gray-500">
            {roomName} • {dateStr}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
          ))}
        </div>
      </div>
    );
  }

  if (hasError) {
    if (isMiniCard) {
      return (
        <div className="booking-mini-card__slots">
          <p className="booking-mini-card__slots-label">Время</p>
          <p className="booking-mini-card__slots-error">
            Ошибка загрузки слотов. Попробуйте обновить страницу.
          </p>
        </div>
      );
    }
    return (
      <div className="mt-4 space-y-4">
        <div className="space-y-1">
          <h3 className="text-2xl font-semibold tracking-tight text-[#485548]">Доступное время</h3>
          <p className="text-sm text-gray-500">
            {roomName} • {dateStr}
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Ошибка загрузки слотов. Попробуйте обновить страницу.
        </div>
      </div>
    );
  }

  if (slots.length === 0 && !isLoading) {
    if (isMiniCard) {
      return (
        <div className="booking-mini-card__slots">
          <p className="booking-mini-card__slots-label">Время</p>
          <p className="booking-mini-card__slots-empty">
            Нет доступных слотов для бронирования на эту дату
          </p>
        </div>
      );
    }
    return (
      <div className="mt-4 space-y-4">
        <div className="space-y-1">
          <h3 className="text-2xl font-semibold tracking-tight text-[#485548]">Доступное время</h3>
          <p className="text-sm text-gray-500">
            {roomName} • {dateStr}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
          Нет доступных слотов для бронирования на эту дату
        </div>
      </div>
    );
  }

  const groupsContent = groupedSlots.map((group, groupIndex) => {
    const showGroupHeader = group.title !== "Без комментария";

    return (
      <div
        key={groupIndex}
        className={isMiniCard ? "booking-mini-card__slot-group" : "mb-10 last:mb-0"}
      >
        {showGroupHeader && (
          <div className={isMiniCard ? "booking-mini-card__slot-group-header" : "mb-5"}>
            <h4
              className={
                isMiniCard
                  ? "booking-mini-card__slot-group-title"
                  : "mb-1 text-base font-medium text-[#485548]"
              }
            >
              {group.title}
            </h4>
            {isMiniCard && (
              <p className="booking-mini-card__slot-group-subtitle">
                {getGroupSubtitle(group.title)}
              </p>
            )}
          </div>
        )}

        <div className={slotGroupGridClass(group.slots.length, variant)}>
          {group.slots.map((slot, slotIndexInGroup) => {
            const slotIndex = getSlotIndex(slot);
            const isSelected = selectedSlotIndex === slotIndex;

            return (
              <SlotButton
                key={slotIndexInGroup}
                slot={slot}
                groupTitle={group.title}
                isSelected={isSelected}
                variant={variant}
                onClick={() => {
                  const indexToPass = isSelected ? -1 : slotIndex;
                  onSlotClick?.(slot, indexToPass);
                }}
              />
            );
          })}
        </div>
      </div>
    );
  });

  if (isMiniCard) {
    return (
      <div className="booking-mini-card__slots">
        <p className="booking-mini-card__slots-label">Время</p>
        <div className="booking-mini-card__slots-groups">{groupsContent}</div>
      </div>
    );
  }

  return <div className="mt-4">{groupsContent}</div>;
};
