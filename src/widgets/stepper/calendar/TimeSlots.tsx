import React, { useMemo } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { RoomTimeSlot } from "../../../api";
import { cn } from "../../../lib/utils";

type Props = {
  slots: RoomTimeSlot[];
  date: Date;
  roomName: string;
  roomId?: string; // ID бани для определения типа группировки
  isLoading?: boolean;
  hasError?: boolean;
  selectedSlotIndex?: number | null; // Индекс выбранного слота
  onSlotClick?: (slot: RoomTimeSlot, index: number) => void;
};

type SlotGroup = {
  title: string;
  slots: RoomTimeSlot[];
};

function formatTimeRange(timeFrom: string, timeTo: string): string {
  return `${timeFrom} — ${timeTo}`;
}

function formatDurationHoursWord(duration: number | undefined): string {
  if (duration == null || duration <= 0) return "0 часов";
  if (duration % 1 !== 0) {
    const rounded = Math.round(duration * 10) / 10;
    return `${String(rounded).replace(".", ",")} ч`;
  }
  const n = duration;
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  let word: string;
  if (last === 1 && abs !== 11) word = "час";
  else if (last >= 2 && last <= 4 && (abs < 10 || abs >= 20)) word = "часа";
  else word = "часов";
  return `${n} ${word}`;
}

function pricePerHour(price: number, duration: number | undefined): number {
  if (!duration || duration <= 0) return 0;
  return Math.round(price / duration);
}

function getGroupSubtitle(title: string): string {
  const normalized = title.toLowerCase();
  if (normalized.includes("подар")) return "Забронируйте время и получите дополнительный час";
  if (normalized.includes("скидк")) return "6 часов отдыха по специальной цене";
  if (normalized.includes("стандарт")) return "Обычное бронирование без акций";
  return "Выберите подходящий слот";
}

function getPromoBadge(title: string): {
  text: string;
  color: string;
  textColor: string;
} | null {
  const normalized = title.toLowerCase();
  if (normalized.includes("подар")) {
    return { text: "+1 час в подарок", color: "bg-[#E8D5C4]", textColor: "text-[#8B6F47]" };
  }
  if (normalized.includes("скидк")) {
    return { text: "Скидка 20%", color: "bg-[#D4E4D7]", textColor: "text-[#485548]" };
  }
  return null;
}

/** Экономия для бейджа (как в макете: час в подарок ≈ стоимость часа; скидка 20% — от цены). */
function getSavingsRub(slot: RoomTimeSlot, groupTitle: string): number {
  const normalized = groupTitle.toLowerCase();
  const hourly = pricePerHour(slot.price, slot.duration);
  if (normalized.includes("подар")) return hourly;
  if (normalized.includes("скидк")) return Math.round(slot.price * 0.2);
  return 0;
}

/**
 * Рассчитывает старую цену (до скидки/акции) для отображения перечёркнутой цены
 * @param slot - слот бронирования
 * @param groupTitle - заголовок группы (для определения типа акции)
 * @returns старая цена (без скидки) или null если акции нет
 */
function getOldPrice(slot: RoomTimeSlot, groupTitle: string): number | null {
  const normalized = groupTitle.toLowerCase();
  
  // Подарок: +1 час бесплатно → старая цена = цена за (duration - 1) часов
  // Формула: (цена / duration) * (duration - 1) ??? Нет, проще:
  // Если дают час в подарок, то текущая цена = цена за (duration - 1) часов
  // Значит старая цена за duration часов = цена / (duration - 1) * duration
  if (normalized.includes("подар")) {
    const duration = slot.duration || 1;
    if (duration <= 1) return null; // не может быть подарка если час и меньше
    // Текущая цена заплачена за (duration - 1) часов со старой ценой за час
    const pricePerHourOld = slot.price / (duration - 1);
    return Math.round(pricePerHourOld * duration);
  }
  
  // Скидка 20% → старая цена = текущая цена / 0.8
  if (normalized.includes("скидк")) {
    return Math.round(slot.price / 0.8);
  }
  
  return null;
}

/**
 * Группирует слоты по комментарию для всех бань.
 */
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

/** Сетка слотов в группе: 3 — всегда 3 колонки; 4 — 2 на мобиле, 4 на lg+; иначе адаптивно. */
function slotGroupGridClass(slotCount: number): string {
  if (slotCount === 3) {
    return "grid grid-cols-3 items-stretch gap-3";
  }
  if (slotCount === 4) {
    return "grid grid-cols-2 items-stretch gap-3 lg:grid-cols-4";
  }
  return "grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4";
}

/**
 * Компонент отображения слотов времени для бронирования
 */
export const TimeSlots: React.FC<Props> = ({
  slots,
  date,
  roomName,
  roomId: _roomId,
  isLoading = false,
  hasError = false,
  selectedSlotIndex = null,
  onSlotClick,
}) => {
  const dateStr = format(date, "d MMMM yyyy", { locale: ru });
  
  // Группируем слоты
  const groupedSlots = useMemo(() => groupSlots(slots), [slots]);
  
  // Находим индекс слота в исходном массиве для правильного выделения
  const getSlotIndex = (slot: RoomTimeSlot): number => {
    return slots.findIndex((s) => 
      s.timeFrom === slot.timeFrom && 
      s.timeTo === slot.timeTo &&
      s.duration === slot.duration
    );
  };

  if (isLoading) {
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

  return (
    <div className="mt-4">

      {groupedSlots.map((group, groupIndex) => (
        <div key={groupIndex} className="mb-10 last:mb-0">
          <div className="mb-5">
            <h4 className="mb-1 text-base font-medium text-[#485548]">{group.title}</h4>
  
          </div>

          <div className={slotGroupGridClass(group.slots.length)}>
            {group.slots.map((slot, slotIndexInGroup) => {
              const slotIndex = getSlotIndex(slot);
              const isSelected = selectedSlotIndex === slotIndex;
              const isAvailable = slot.isAvailable === true;
              const promoBadge = getPromoBadge(group.title);
              const savings = getSavingsRub(slot, group.title);
              const oldPrice = getOldPrice(slot, group.title);
              const isGift = group.title.toLowerCase().includes("подар");

              // if (!isAvailable) {
              //   return null
              // }

              return (
                <button
                  key={slotIndexInGroup}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => {
                    if (!isAvailable) return;
                    const indexToPass = isSelected ? -1 : slotIndex;
                    onSlotClick?.(slot, indexToPass);
                  }}
                  className={cn(
                    "relative flex h-full  flex-col rounded-xl border p-4 text-left transition-all",
                    !isAvailable &&
                      "cursor-not-allowed border-gray-200 bg-gray-50 opacity-40",
                    isAvailable &&
                      (isSelected
                        ? "border-2 border-[#485548] bg-white shadow-md"
                        : "border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm")
                  )}
                >
                  {/* {promoBadge ? (
                    <div
                      className={cn(
                        "mb-4 inline-block max-w-full rounded-full px-3 py-1 text-xs font-medium",
                        promoBadge.color,
                        promoBadge.textColor
                      )}
                    >
                      {promoBadge.text}
                    </div>
                  ) : null} */}

                  <div className="mb-4 min-w-0 flex-1">
                    <div className="mb-1 text-base sm:text-lg font-semibold text-[#485548] text-gray-800">
                      {formatTimeRange(slot.timeFrom, slot.timeTo)}
                    </div>
                    {/* <div className="text-sm text-gray-500">{formatDurationHoursWord(slot.duration)}</div> */}
                    <div className="text-sm text-gray-500">{slot.duration} ч. 
                      {isGift &&  ` (акция ${slot.duration} = ${slot.duration-1})`}
                    </div>
                  </div>

                  <div className="mt-auto border-t border-gray-100 pt-3">
                    <div className="flex w-full min-w-0 flex-wrap items-end justify-end gap-x-2 gap-y-0.5">
                      {oldPrice != null ? (
                        <span className="text-right text-sm tabular-nums text-gray-400 line-through">
                          {oldPrice.toLocaleString("ru-RU")} ₽
                        </span>
                      ) : null}
                      <span className="text-right text-base font-medium tabular-nums text-gray-600">
                        {slot.price.toLocaleString("ru-RU")} ₽
                      </span>
                    </div>
                    {/* {savings > 0 ? (
                      <div className="mt-1 text-right text-xs font-medium text-[#485548]">
                        −{savings.toLocaleString("ru-RU")} ₽
                      </div>
                    ) : null} */}
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
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{background:"rgb(55 55 55 / 0.2)"}}>
                      {/* <span className="text-sm font-medium text-gray-500">Недоступно</span> */}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
