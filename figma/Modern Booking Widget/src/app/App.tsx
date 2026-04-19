import { useState } from 'react';
import { BathhouseSelector } from './components/BathhouseSelector';
import { DateSelector } from './components/DateSelector';
import { TimeSlotSelector } from './components/TimeSlotSelector';
import { BookingButton } from './components/BookingButton';

type Bathhouse = {
  id: string;
  name: string;
  description: string;
  capacity: number;
  hasImage: boolean;
};

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

const bathhouses: Bathhouse[] = [
  {
    id: '1',
    name: 'Рябиновая баня',
    description: 'Вместимость 4-6 человек. Закрытый дворик со СПА-зон...',
    capacity: 6,
    hasImage: false,
  },
  {
    id: '2',
    name: 'Берёзовая баня',
    description: 'Вместимость 6-8 человек. Закрыта территория с манга...',
    capacity: 8,
    hasImage: false,
  },
  {
    id: '3',
    name: 'Кедровая баня',
    description: 'Вместимость 10-20 человек. Просторная комната отдых...',
    capacity: 20,
    hasImage: false,
  },
];

const timeSlots: TimeSlot[] = [
  // Акция "ЧАС В ПОДАРОК"
  { id: '1', timeFrom: '09:00', timeTo: '12:00', duration: 3, price: 5200, pricePerHour: 2600, promotion: 'free_hour', available: true },
  { id: '2', timeFrom: '13:00', timeTo: '17:00', duration: 4, price: 7800, pricePerHour: 2600, promotion: 'free_hour', available: true },
  { id: '3', timeFrom: '18:00', timeTo: '23:00', duration: 5, price: 10400, pricePerHour: 2600, promotion: 'free_hour', available: true },
  { id: '4', timeFrom: '19:00', timeTo: '00:00', duration: 5, price: 10400, pricePerHour: 2600, promotion: 'free_hour', available: true },

  // Акция "6 часов отдыха с 20% скидкой"
  { id: '5', timeFrom: '09:00', timeTo: '15:00', duration: 6, price: 12480, pricePerHour: 2080, promotion: 'discount_20', available: true },
  { id: '6', timeFrom: '10:00', timeTo: '16:00', duration: 6, price: 12480, pricePerHour: 2080, promotion: 'discount_20', available: true },
  { id: '7', timeFrom: '11:00', timeTo: '17:00', duration: 6, price: 12480, pricePerHour: 2080, promotion: 'discount_20', available: true },
  { id: '8', timeFrom: '18:00', timeTo: '00:00', duration: 6, price: 12480, pricePerHour: 2080, promotion: 'discount_20', available: true },

  // 2-3 часа бани (без скидок)
  { id: '9', timeFrom: '10:00', timeTo: '12:00', duration: 2, price: 5200, pricePerHour: 2600, available: true },
  { id: '10', timeFrom: '14:00', timeTo: '17:00', duration: 3, price: 7800, pricePerHour: 2600, available: true },
  { id: '11', timeFrom: '18:00', timeTo: '21:00', duration: 3, price: 7800, pricePerHour: 2600, available: true },
  { id: '12', timeFrom: '22:00', timeTo: '00:00', duration: 2, price: 5200, pricePerHour: 2600, available: true },
];

export default function App() {
  const [selectedBathhouse, setSelectedBathhouse] = useState<string>('1');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 4, 28));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showAllBathhouses, setShowAllBathhouses] = useState(false);

  const handleBooking = () => {
    if (selectedBathhouse && selectedDate && selectedSlot) {
      const bathhouse = bathhouses.find(b => b.id === selectedBathhouse);
      const slot = timeSlots.find(s => s.id === selectedSlot);
      alert(`Бронирование:\nБаня: ${bathhouse?.name}\nДата: ${selectedDate.toLocaleDateString('ru-RU')}\nВремя: ${slot?.timeFrom} - ${slot?.timeTo}\nЦена: ${slot?.price} ₽`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Stepper */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-1.5 sm:gap-3 mb-6">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#485548] text-white flex items-center justify-center text-xs sm:text-sm font-medium">
                1
              </div>
              <span className="text-xs sm:text-sm font-medium text-[#485548] hidden sm:inline">Баня</span>
            </div>
            <div className="flex-1 h-px bg-[#485548]" />
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#485548] text-white flex items-center justify-center text-xs sm:text-sm font-medium">
                2
              </div>
              <span className="text-xs sm:text-sm font-medium text-[#485548] hidden sm:inline">Дата и время</span>
            </div>
            <div className="flex-1 h-px bg-gray-300" />
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs sm:text-sm font-medium">
                3
              </div>
              <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">Подтверждение</span>
            </div>
          </div>
        </div>

        {/* Bathhouse Selector */}
        <BathhouseSelector
          bathhouses={bathhouses}
          selectedBathhouse={selectedBathhouse}
          showAll={showAllBathhouses}
          onSelectBathhouse={setSelectedBathhouse}
          onToggleShowAll={() => setShowAllBathhouses(!showAllBathhouses)}
        />

        {/* Date Selector */}
        <DateSelector
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {/* Time Slots */}
        <div className="mt-8 sm:mt-12">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-medium text-[#485548] mb-2">Доступное время</h2>
            <p className="text-xs sm:text-sm text-gray-600">
              {bathhouses.find(b => b.id === selectedBathhouse)?.name} • {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <TimeSlotSelector
            slots={timeSlots}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
          />
        </div>

        {/* Booking Button */}
        <BookingButton
          disabled={!selectedSlot}
          onBook={handleBooking}
        />
      </div>
    </div>
  );
}