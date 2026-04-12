import React, { useMemo } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { RoomTimeSlot } from "../../../api";

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

/**
 * Форматирует время для отображения в формате диапазона
 */
function formatTimeRange(timeFrom: string, timeTo: string): string {
  return `${timeFrom}-${timeTo}`;
}

/**
 * Форматирует длительность для отображения в часах
 */
function formatDuration(duration: number | undefined): string {
  if (!duration) return "0 часов";
  // Проверяем, является ли число целым
  if (duration % 1 === 0) {
    // Целое число
    if (duration === 1) return "1 час";
    if (duration >= 2 && duration <= 4) return `${duration} часа`;
    return `${duration} часов`;
  } else {
    // Дробное число (например, 1.5, 2.5)
    // Округляем до одного знака после запятой
    const rounded = Math.round(duration * 10) / 10;
    return `${rounded} часа`;
  }
}

/**
 * Группирует слоты по комментарию (для бани 9e5a3d5c-868c-4346-963a-6a4835bba24f)
 * или по длительности (для остальных бань)
 */
function groupSlots(slots: RoomTimeSlot[], roomId?: string): SlotGroup[] {
  const SPECIAL_ROOM_ID = "9e5a3d5c-868c-4346-963a-6a4835bba24f";
  
  if (roomId === SPECIAL_ROOM_ID) {
    // Группировка по comment
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
  } else {
    // Группировка по длительности
    const groupsMap = new Map<number, RoomTimeSlot[]>();
    
    slots.forEach((slot) => {
      const duration = slot.duration || 0;
      if (!groupsMap.has(duration)) {
        groupsMap.set(duration, []);
      }
      groupsMap.get(duration)!.push(slot);
    });
    
    return Array.from(groupsMap.entries())
      .sort(([a], [b]) => a - b) // Сортировка по длительности
      .map(([duration, groupSlots]) => ({
        title: `${duration} ${duration === 1 ? "час" : duration < 5 ? "часа" : "часов"}`,
        slots: groupSlots,
      }));
  }
}

/**
 * Компонент отображения слотов времени для бронирования
 */
export const TimeSlots: React.FC<Props> = ({
  slots,
  date,
  roomName,
  roomId,
  isLoading = false,
  hasError = false,
  selectedSlotIndex = null,
  onSlotClick,
}) => {
  const dateStr = format(date, "d MMMM yyyy", { locale: ru });
  
  // Группируем слоты
  const groupedSlots = useMemo(() => groupSlots(slots, roomId), [slots, roomId]);
  
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
      <div className="stepper-slots">
        <h3 className="stepper-slots__title">
          Доступное время для бронирования
        </h3>
        <p className="stepper-slots__subtitle">
          {roomName} • {dateStr}
        </p>
        <div className="stepper-slots__grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="stepper-slots__card-skeleton">
              <div className="stepper-slots__card-skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="stepper-slots">
        <h3 className="stepper-slots__title">
          Доступное время для бронирования
        </h3>
        <p className="stepper-slots__subtitle">
          {roomName} • {dateStr}
        </p>
        <div className="stepper-slots__empty stepper-slots__empty--error">
          Ошибка загрузки слотов. Попробуйте обновить страницу.
        </div>
      </div>
    );
  }

  if (slots.length === 0 && !isLoading) {
    return (
      <div className="stepper-slots">
        <h3 className="stepper-slots__title">
          Доступное время для бронирования
        </h3>
        <p className="stepper-slots__subtitle">
          {roomName} • {dateStr}
        </p>
        <div className="stepper-slots__empty">
          Нет доступных слотов для бронирования на эту дату
        </div>
      </div>
    );
  }

  return (
    <div className="stepper-slots">
      <h3 className="stepper-slots__title">
        Доступное время для бронирования
      </h3>
      <p className="stepper-slots__subtitle">
        {roomName} • {dateStr}
      </p>
      
      {/* Группы слотов */}
      {groupedSlots.map((group, groupIndex) => {
        // Определяем, группируем ли по комментарию (для бани 9e5a3d5c-868c-4346-963a-6a4835bba24f)
        const isGroupedByComment = roomId === "9e5a3d5c-868c-4346-963a-6a4835bba24f";
        const shouldHideComment = isGroupedByComment;
        
        return (
          <div key={groupIndex} className="stepper-slots__group">
            <h4 className="stepper-slots__group-title">{group.title}</h4>
            <div className="stepper-slots__grid">
              {group.slots.map((slot, slotIndexInGroup) => {
                const slotIndex = getSlotIndex(slot);
                const isSelected = selectedSlotIndex === slotIndex;
                const isAvailable = slot.isAvailable === true;
                
                return (
                  <div
                    key={slotIndexInGroup}
                    className={`stepper-slots__card ${
                      !isAvailable ? "stepper-slots__card--unavailable" : ""
                    } ${isSelected ? "stepper-slots__card--selected" : ""}`}
                    onClick={() => {
                      if (isAvailable) {
                        // Если слот уже выбран - передаем -1 для снятия выбора, иначе передаем индекс
                        const indexToPass = isSelected ? -1 : slotIndex;
                        onSlotClick?.(slot, indexToPass);
                      }
                    }}
                  >
                    {/* Время - в одну строку, диапазон */}
                    <div className="stepper-slots__card-time">
                      {formatTimeRange(slot.timeFrom, slot.timeTo)}
                    </div>
                    
                    {/* Длительность - под временем */}
                    <div className="stepper-slots__card-duration">
                      {formatDuration(slot.duration)}
                    </div>
                    
                    {/* Цена - крупно и выделено */}
                    <div className="stepper-slots__card-price">
                      {slot.price.toLocaleString("ru-RU")} ₽
                    </div>
                    
                    {/* Комментарий - только если не группируем по комментарию и комментарий есть */}
                    {!shouldHideComment && slot.comment && (
                      <div className="stepper-slots__card-comment" title={slot.comment}>
                        {slot.comment}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
