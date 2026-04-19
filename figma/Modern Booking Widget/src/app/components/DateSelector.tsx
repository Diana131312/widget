import { useState } from 'react';

type DateSelectorProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
};

const WEEKDAYS_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

export function DateSelector({ selectedDate, onSelectDate }: DateSelectorProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 4, 1));

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonthDate = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push(prevMonthDate);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const days = getDaysInMonth(currentMonth);

  const getAvailabilityColor = (date: Date | null) => {
    if (!date) return '';
    const dayOfMonth = date.getDate();
    if ([1, 2, 8, 15, 16, 20, 22, 29].includes(dayOfMonth)) return 'bg-red-400';
    if ([6, 20, 27].includes(dayOfMonth)) return 'bg-yellow-400';
    return 'bg-green-400';
  };

  const isSelected = (date: Date | null) => {
    if (!date) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isCurrentMonth = (date: Date | null) => {
    if (!date) return false;
    return date.getMonth() === currentMonth.getMonth();
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <button
          onClick={prevMonth}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-sm sm:text-base font-medium text-[#485548]">
          {currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS_SHORT.map((day) => (
          <div key={day} className="text-center text-[10px] sm:text-xs font-medium text-gray-500 uppercase pb-2 sm:pb-3">
            {day}
          </div>
        ))}
        {days.map((date, index) => (
          <button
            key={index}
            onClick={() => date && onSelectDate(date)}
            disabled={!date || !isCurrentMonth(date)}
            className={`
              relative aspect-square rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all active:scale-95
              ${!date || !isCurrentMonth(date) ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-700'}
              ${isSelected(date) ? 'bg-[#485548] text-white hover:bg-[#485548]/90' : ''}
            `}
          >
            {date && (
              <>
                <span className="relative z-10">{date.getDate()}</span>
                {isCurrentMonth(date) && !isSelected(date) && (
                  <div className={`absolute bottom-0.5 sm:bottom-1 left-1/2 -translate-x-1/2 w-8 sm:w-12 h-0.5 rounded-full ${getAvailabilityColor(date)}`} />
                )}
              </>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-3 sm:gap-5 text-[10px] sm:text-xs text-gray-600">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2.5 sm:w-3 h-0.5 bg-green-500 rounded-full" />
          <span>Много мест</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2.5 sm:w-3 h-0.5 bg-yellow-500 rounded-full" />
          <span>Мало мест</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2.5 sm:w-3 h-0.5 bg-red-500 rounded-full" />
          <span>Нет мест</span>
        </div>
      </div>
    </div>
  );
}
