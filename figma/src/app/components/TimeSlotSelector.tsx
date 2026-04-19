type TimeSlot = {
  id: string;
  timeFrom: string;
  timeTo: string;
  duration: number;
  price: number;
  promotion?: string;
  available: boolean;
  pricePerHour: number;
};

type TimeSlotSelectorProps = {
  slots: TimeSlot[];
  selectedSlot: string | null;
  onSelectSlot: (id: string) => void;
};

export function TimeSlotSelector({ slots, selectedSlot, onSelectSlot }: TimeSlotSelectorProps) {
  const freeHourSlots = slots.filter(s => s.promotion === 'free_hour');
  const discountSlots = slots.filter(s => s.promotion === 'discount_20');
  const standardSlots = slots.filter(s => !s.promotion);

  const getPromoBadge = (promotion?: string) => {
    if (promotion === 'free_hour') {
      return { text: '+1 час в подарок', color: 'bg-[#E8D5C4]', textColor: 'text-[#8B6F47]' };
    }
    if (promotion === 'discount_20') {
      return { text: 'Скидка 20%', color: 'bg-[#D4E4D7]', textColor: 'text-[#485548]' };
    }
    return null;
  };

  const renderSlotGroup = (
    title: string,
    subtitle: string,
    slotList: TimeSlot[]
  ) => {
    if (slotList.length === 0) return null;

    return (
      <div className="mb-8 sm:mb-10">
        <div className="mb-4 sm:mb-5">
          <h3 className="text-sm sm:text-base font-medium text-[#485548] mb-1">{title}</h3>
          <p className="text-xs sm:text-sm text-gray-500">{subtitle}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {slotList.map((slot) => {
            const isSelected = selectedSlot === slot.id;
            const promoBadge = getPromoBadge(slot.promotion);
            const savings = slot.promotion === 'free_hour' ? slot.pricePerHour :
                           slot.promotion === 'discount_20' ? Math.round(slot.pricePerHour * 0.25 * slot.duration) : 0;

            return (
              <button
                key={slot.id}
                onClick={() => slot.available && onSelectSlot(slot.id)}
                disabled={!slot.available}
                className={`
                  relative p-3 sm:p-4 rounded-lg sm:rounded-xl text-left transition-all active:scale-[0.98]
                  ${!slot.available ? 'opacity-40 cursor-not-allowed bg-gray-50 border border-gray-200' : ''}
                  ${isSelected
                    ? 'bg-white border-2 border-[#485548] shadow-md'
                    : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }
                `}
              >
                {promoBadge && (
                  <div className={`inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium mb-3 sm:mb-4 ${promoBadge.color} ${promoBadge.textColor}`}>
                    {promoBadge.text}
                  </div>
                )}

                <div className="mb-3 sm:mb-4">
                  <div className="text-sm sm:text-lg font-semibold text-[#485548] mb-0.5 sm:mb-1 leading-tight">
                    {slot.timeFrom} — {slot.timeTo}
                  </div>
                  <div className="text-[10px] sm:text-sm text-gray-500">
                    {slot.duration} {slot.duration === 1 ? 'час' : slot.duration < 5 ? 'часа' : 'часов'}
                  </div>
                </div>

                <div className="flex items-end justify-between pt-2 sm:pt-3 border-t border-gray-100">
                  <div>
                    <div className="text-sm sm:text-lg font-medium text-gray-900">
                      {slot.price.toLocaleString()} ₽
                    </div>
                  </div>
                  {savings > 0 && (
                    <div className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-[#D4E4D7] text-[#485548] font-medium">
                      −{savings.toLocaleString()} ₽
                    </div>
                  )}
                </div>

                {isSelected && (
                  <div className="absolute top-2 sm:top-3 right-2 sm:right-3 w-4 h-4 sm:w-5 sm:h-5 bg-[#485548] rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}

                {!slot.available && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-lg sm:rounded-xl">
                    <span className="text-xs sm:text-sm font-medium text-gray-500">Недоступно</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderSlotGroup(
        'Акция "Час в подарок"',
        'Забронируйте время и получите дополнительный час',
        freeHourSlots
      )}

      {renderSlotGroup(
        'Пакеты со скидкой 20%',
        '6 часов отдыха по специальной цене',
        discountSlots
      )}

      {renderSlotGroup(
        'Стандартные слоты',
        'Обычное бронирование без акций',
        standardSlots
      )}
    </div>
  );
}
