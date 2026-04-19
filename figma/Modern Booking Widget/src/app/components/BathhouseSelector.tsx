type Bathhouse = {
  id: string;
  name: string;
  description: string;
  capacity: number;
  hasImage: boolean;
};

type BathhouseSelectorProps = {
  bathhouses: Bathhouse[];
  selectedBathhouse: string;
  showAll: boolean;
  onSelectBathhouse: (id: string) => void;
  onToggleShowAll: () => void;
};

export function BathhouseSelector({
  bathhouses,
  selectedBathhouse,
  showAll,
  onSelectBathhouse,
  onToggleShowAll,
}: BathhouseSelectorProps) {
  return (
    <div className="mb-8 sm:mb-12">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-medium text-[#485548] mb-1 sm:mb-2">Выбор бани</h2>
        <p className="text-xs sm:text-sm text-gray-600">Выберите баню из списка или режим всех бань</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <button
          onClick={() => onToggleShowAll()}
          className={`flex-1 sm:flex-none px-4 sm:px-5 py-3 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            !showAll
              ? 'bg-[#485548] text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Конкретная баня
        </button>
        <button
          onClick={() => onToggleShowAll()}
          className={`flex-1 sm:flex-none px-4 sm:px-5 py-3 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            showAll
              ? 'bg-[#485548] text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Все бани
        </button>
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600">
              Выбрана: <span className="font-medium text-[#485548]">{bathhouses.find(b => b.id === selectedBathhouse)?.name}</span>
            </span>
            <span className="text-xs text-gray-500">Режим: одна</span>
          </div>
        </div>

        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer list-none px-4 sm:px-5 py-3 sm:py-4 hover:bg-gray-50 transition-colors active:bg-gray-100">
            <span className="text-xs sm:text-sm font-medium text-gray-700">Список бань</span>
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 space-y-2">
            {bathhouses.map((bathhouse) => (
              <button
                key={bathhouse.id}
                onClick={() => onSelectBathhouse(bathhouse.id)}
                className={`w-full text-left p-3 sm:p-4 rounded-lg sm:rounded-xl transition-all active:scale-[0.98] ${
                  selectedBathhouse === bathhouse.id
                    ? 'bg-[#485548]/5 border-2 border-[#485548]'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm sm:text-base font-medium text-gray-900">{bathhouse.name}</h3>
                      {selectedBathhouse === bathhouse.id && (
                        <div className="w-2 h-2 rounded-full bg-[#485548]" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{bathhouse.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
