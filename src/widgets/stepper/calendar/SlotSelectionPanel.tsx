import React from "react";
import type { RoomTimeSlot } from "../../../api";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Separator } from "../../../components/ui/separator";

type Props = {
  selectedSlot: RoomTimeSlot;
  guestCount: number;
  maxGuests: number;
  onGuestCountChange: (count: number) => void;
  onContinue: () => void;
};

/**
 * Форматирует время для отображения
 * Если timeTo = "23:59", отображает "до 24:00"
 */
function formatTimeRange(timeFrom: string, timeTo: string): string {
  if (timeTo === "23:59") {
    return `${timeFrom} - до 24:00`;
  }
  return `${timeFrom} - ${timeTo}`;
}

/**
 * Нижняя панель выбора гостей и продолжения бронирования
 */
export const SlotSelectionPanel: React.FC<Props> = ({
  selectedSlot,
  guestCount,
  maxGuests,
  onGuestCountChange,
  onContinue,
}) => {
  const canDecrease = guestCount > 1;
  const canIncrease = guestCount < maxGuests;

  const handleDecrease = () => {
    if (canDecrease) {
      onGuestCountChange(guestCount - 1);
    }
  };

  const handleIncrease = () => {
    if (canIncrease) {
      onGuestCountChange(guestCount + 1);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Выбранный слот</div>
          <div className="text-base font-semibold text-slate-800">
            {formatTimeRange(selectedSlot.timeFrom, selectedSlot.timeTo)}
          </div>
          <div className="text-xl font-bold text-slate-800">
            {selectedSlot.price.toLocaleString("ru-RU")} ₽
          </div>
        </div>

        <Separator orientation="vertical" className="hidden h-10 lg:block" />

        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Количество гостей</div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDecrease}
              disabled={!canDecrease}
              aria-label="Уменьшить количество гостей"
            >
              −
            </Button>
            <Badge variant="secondary" className="min-w-10 justify-center">
              {guestCount}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleIncrease}
              disabled={!canIncrease}
              aria-label="Увеличить количество гостей"
            >
              +
            </Button>
            <span className="text-xs text-slate-500">(макс. {maxGuests})</span>
          </div>
        </div>

        <Button
          type="button"
          className="h-11 rounded-xl bg-slate-800 px-6 text-sm font-semibold text-white hover:bg-slate-700 lg:min-w-40"
          onClick={onContinue}
        >
          Забронировать
        </Button>
      </div>
    </div>
  );
};
