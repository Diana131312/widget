type BookingButtonProps = {
  disabled: boolean;
  onBook: () => void;
};

export function BookingButton({ disabled, onBook }: BookingButtonProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="hidden sm:flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {disabled ? (
              <span>Выберите временной слот для продолжения</span>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#D4E4D7] flex items-center justify-center">
                  <svg className="w-3 h-3 text-[#485548]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-[#485548] font-medium">Готово к бронированию</span>
              </div>
            )}
          </div>
          <button
            onClick={onBook}
            disabled={disabled}
            className={`
              px-8 py-3 rounded-xl font-medium transition-all text-sm
              ${disabled
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-[#485548] text-white hover:bg-[#485548]/90 shadow-sm hover:shadow-md active:scale-[0.98]'
              }
            `}
          >
            Забронировать
          </button>
        </div>

        <div className="sm:hidden">
          {!disabled && (
            <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
              <div className="w-4 h-4 rounded-full bg-[#D4E4D7] flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-[#485548]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-[#485548] font-medium">Готово к бронированию</span>
            </div>
          )}
          <button
            onClick={onBook}
            disabled={disabled}
            className={`
              w-full py-4 rounded-xl font-medium transition-all text-sm
              ${disabled
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-[#485548] text-white active:bg-[#485548]/90 shadow-sm active:scale-[0.98]'
              }
            `}
          >
            {disabled ? 'Выберите временной слот' : 'Забронировать'}
          </button>
        </div>
      </div>
    </div>
  );
}
