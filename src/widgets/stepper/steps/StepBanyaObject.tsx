import React, { useMemo, useState, useEffect } from "react";
import { startOfWeek as startWeek, startOfMonth as startMonth } from "date-fns";
import type { WidgetRoom } from "../../../api";
import { createWidgetApi } from "../../../api";
import type { StepProps } from "./stepTypes";
import {
  WeeklyCalendar,
  MonthlyCalendar,
  TimeSlots,
  SlotSelectionPanel,
} from "../calendar";
import {
  updateUrl,
  weekToUrlDate,
  urlDateToWeek,
  monthToUrlDate,
  urlDateToMonth,
  parseUrlState,
} from "../utils/urlSync";
import {
  loadWeeklyAvailabilityForAllRooms,
  loadMonthlyAvailabilityForRoom,
  convertToWeeklyOccupancyData,
  convertToMonthlyOccupancyData,
} from "../calendar/availabilityService";
import { loadRoomTimeSlots } from "../calendar/slotsService";
import type { WeeklyOccupancyData, MonthlyOccupancyData } from "../calendar/types";
import type { RoomTimeSlot } from "../../../api";
import { parse, format } from "date-fns";

function getImageUrl(imagePath: string | undefined, baseUrl?: string): string {
  if (!imagePath) return "";
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  // Если путь относительный, можно добавить base URL
  // Пока возвращаем как есть (API должен возвращать полные URL)
  return imagePath;
}

function getWeekDaySlotsCount(room: WidgetRoom): number {
  const pricePeriod = room.pricePeriod as
    | {
        prices?: {
          weekDaySlots?: unknown[];
        };
      }
    | null
    | undefined;
  if (!pricePeriod?.prices?.weekDaySlots) return 0;
  return Array.isArray(pricePeriod.prices.weekDaySlots)
    ? pricePeriod.prices.weekDaySlots.length
    : 0;
}

function truncateDescription(desc: string | null | undefined, maxLen = 100): string {
  if (!desc) return "";
  return desc.length > maxLen ? desc.substring(0, maxLen) + "..." : desc;
}

export const StepBanyaObject: React.FC<StepProps> = ({
  state,
  setState,
  goTo,
  onShowToast,
  alias = "les",
}) => {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [calendarWeekStart, setCalendarWeekStart] = useState<Date>(
    startWeek(new Date(), { weekStartsOn: 1 })
  );
  const [calendarMonthStart, setCalendarMonthStart] = useState<Date>(
    startMonth(new Date())
  );
  
  const [weeklyData, setWeeklyData] = useState<WeeklyOccupancyData>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyOccupancyData>([]);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(false);
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState<Set<string>>(new Set());
  const [errorRooms, setErrorRooms] = useState<Set<string>>(new Set());
  const [hasMonthlyError, setHasMonthlyError] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeSlots, setTimeSlots] = useState<RoomTimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [hasSlotsError, setHasSlotsError] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [isAccordionOpen, setIsAccordionOpen] = useState(true); // По умолчанию открыт
  
  const api = useMemo(() => createWidgetApi({ alias }), [alias]);

  const rooms = useMemo<WidgetRoom[]>(() => {
    const config = state.data.config;
    if (!config || !Array.isArray(config.rooms)) return [];
    return config.rooms;
  }, [state.data.config]);

  const selectedRoom = useMemo<WidgetRoom | null>(() => {
    if (!state.data.selectedRoomId) return null;
    return rooms.find((r) => r.id === state.data.selectedRoomId) || null;
  }, [rooms, state.data.selectedRoomId]);

  const isLoading = !state.data.config;

  // Авто-выбор "Все бани" при загрузке, если ничего не выбрано
  useEffect(() => {
    if (!isLoading && rooms.length > 0 && !state.data.allRoomsSelected && !state.data.selectedRoomId) {
      const newState = {
        ...state,
        data: {
          ...state.data,
          allRoomsSelected: true,
        },
      };
      setState(newState);
      updateUrl({
        step: "bani",
        mode: "all",
        calendarType: "week",
        date: weekToUrlDate(calendarWeekStart),
        categoryId: state.data.categoryId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, rooms.length]);

  // Закрываем аккордеон при выборе бани
  useEffect(() => {
    if (state.data.selectedRoomId || state.data.allRoomsSelected) {
      setIsAccordionOpen(false);
    } else {
      setIsAccordionOpen(true);
    }
  }, [state.data.selectedRoomId, state.data.allRoomsSelected]);

  // Восстановление состояния из URL при загрузке
  useEffect(() => {
    const urlState = parseUrlState();
    
    // Восстанавливаем дату календаря
    if (urlState.week) {
      setCalendarWeekStart(urlDateToWeek(urlState.week));
    } else if (urlState.month) {
      setCalendarMonthStart(urlDateToMonth(urlState.month));
    }
    
    // Восстанавливаем выбранную дату для слотов
    if (urlState.date) {
      const date = parse(urlState.date, "yyyy-MM-dd", new Date());
      if (!isNaN(date.getTime())) {
        setSelectedDate(date);
      }
    }
    
    // Восстанавливаем выбор бани
    if (urlState.roomId && !state.data.selectedRoomId) {
      setState((prev) => ({
        ...prev,
        data: {
          ...prev.data,
          selectedRoomId: urlState.roomId,
          allRoomsSelected: false,
        },
      }));
    } else if (urlState.mode === "all" && !state.data.allRoomsSelected) {
      setState((prev) => ({
        ...prev,
        data: {
          ...prev.data,
          allRoomsSelected: true,
          selectedRoomId: undefined,
        },
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Загружаем слоты при выборе даты
  useEffect(() => {
    if (!selectedDate || !state.data.selectedRoomId || !selectedRoom) {
      setTimeSlots([]);
      return;
    }

    let cancelled = false;
    setIsLoadingSlots(true);
    setHasSlotsError(false);

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    loadRoomTimeSlots(api, selectedRoom.id, dateStr)
      .then((slots) => {
        if (cancelled) return;
        setTimeSlots(slots);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Ошибка загрузки слотов:", error);
        setHasSlotsError(true);
        setTimeSlots([]);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSlots(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, state.data.selectedRoomId, selectedRoom, api]);

  if (state.data.categoryId !== "banya") {
    return (
      <div>
        <div className="stepper-widget__error">
          Этот шаг доступен только для категории «Баня».
        </div>
        <div className="stepper-widget__grid">
          <button
            type="button"
            className="stepper-widget__btn stepper-widget__btn--ghost"
            onClick={() => goTo("category")}
          >
            Назад к выбору категории
          </button>
        </div>
      </div>
    );
  }

  const handleRoomClick = (room: WidgetRoom) => {
    // eslint-disable-next-line no-console
    console.log("🏠 Выбрана баня:", room.name);
    // eslint-disable-next-line no-console
    console.log("📝 Описание:", room.description || "(нет описания)");
    // eslint-disable-next-line no-console
    console.log(
      "💰 Цены:",
      JSON.stringify(room.pricePeriod?.prices || {}, null, 2)
    );

    // Сохраняем выбор в state
    setState({
      ...state,
      data: {
        ...state.data,
        selectedRoomId: room.id,
        allRoomsSelected: false,
      },
    });

    // Обновляем URL
    updateUrl({
      step: "bani",
      mode: "single",
      roomId: room.id,
      calendarType: "month",
      month: monthToUrlDate(calendarMonthStart),
      categoryId: state.data.categoryId,
    });

    // Показать SnackBar с названием выбранной бани
    if (onShowToast) {
      onShowToast(`Выбрана баня: ${room.name}`);
    }
  };

  const handleAllRoomsClick = () => {
    // eslint-disable-next-line no-console
    console.log("🔥 Выбраны ВСЕ бани");
    // eslint-disable-next-line no-console
    console.log("📋 Список бань:");

    rooms.forEach((room, idx) => {
      // eslint-disable-next-line no-console
      console.log(`\n${idx + 1}. Название: ${room.name}`);
      // eslint-disable-next-line no-console
      console.log(
        `   Описание (первые 100 символов): ${truncateDescription(room.description, 100)}`
      );
      // eslint-disable-next-line no-console
      console.log(
        `   Количество слотов в weekDaySlots: ${getWeekDaySlotsCount(room)}`
      );
    });

    // Сохраняем выбор "Все бани" в state
    setState({
      ...state,
      data: {
        ...state.data,
        selectedRoomId: undefined,
        allRoomsSelected: true,
      },
    });

    // Обновляем URL
    updateUrl({
      step: "bani",
      mode: "all",
      calendarType: "week",
      date: weekToUrlDate(calendarWeekStart),
      categoryId: state.data.categoryId,
    });
  };

  const handleImageLoad = (imagePath: string) => {
    setLoadingImages((prev) => {
      const next = new Set(prev);
      next.delete(imagePath);
      return next;
    });
    setImageErrors((prev) => {
      const next = new Set(prev);
      next.delete(imagePath);
      return next;
    });
  };

  const handleImageError = (imagePath: string) => {
    setLoadingImages((prev) => {
      const next = new Set(prev);
      next.delete(imagePath);
      return next;
    });
    setImageErrors((prev) => new Set(prev).add(imagePath));
  };

  const handleImageLoadStart = (imagePath: string) => {
    setLoadingImages((prev) => new Set(prev).add(imagePath));
  };

  // Загружаем данные для недельного календаря (все бани)
  useEffect(() => {
    if (!state.data.allRoomsSelected || rooms.length === 0) {
      setWeeklyData([]);
      return;
    }

    let cancelled = false;
    setIsLoadingWeekly(true);
    setLoadingRooms(new Set(rooms.map((r) => r.id)));
    setErrorRooms(new Set());

    loadWeeklyAvailabilityForAllRooms(api, rooms, calendarWeekStart)
      .then((availabilityMap) => {
        if (cancelled) return;
        const data = convertToWeeklyOccupancyData(rooms, calendarWeekStart, availabilityMap);
        setWeeklyData(data);
        setLoadingRooms(new Set());
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Ошибка загрузки занятости для всех бань:", error);
        setErrorRooms(new Set(rooms.map((r) => r.id)));
        setLoadingRooms(new Set());
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingWeekly(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [state.data.allRoomsSelected, rooms, calendarWeekStart, api]);

  // Загружаем данные для месячного календаря (конкретная баня)
  useEffect(() => {
    if (!state.data.selectedRoomId || !selectedRoom) {
      setMonthlyData([]);
      return;
    }

    let cancelled = false;
    setIsLoadingMonthly(true);
    setHasMonthlyError(false);

    loadMonthlyAvailabilityForRoom(api, selectedRoom.id, calendarMonthStart)
      .then((availability) => {
        if (cancelled) return;
        const data = convertToMonthlyOccupancyData(calendarMonthStart, availability);
        setMonthlyData(data);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Ошибка загрузки занятости для бани:", error);
        setHasMonthlyError(true);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingMonthly(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [state.data.selectedRoomId, selectedRoom, calendarMonthStart, api]);

  const hasSelection = state.data.allRoomsSelected || state.data.selectedRoomId;

  const handleWeekChange = (newWeekStart: Date) => {
    setCalendarWeekStart(newWeekStart);
    setSelectedDate(null); // Сбрасываем выбранную дату при смене недели
    updateUrl({
      step: "bani",
      mode: "all",
      calendarType: "week",
      week: weekToUrlDate(newWeekStart),
      categoryId: state.data.categoryId,
    });
  };

  const handleMonthChange = (newMonthStart: Date) => {
    setCalendarMonthStart(newMonthStart);
    setSelectedDate(null); // Сбрасываем выбранную дату при смене месяца
    if (state.data.selectedRoomId) {
      updateUrl({
        step: "bani",
        mode: "single",
        roomId: state.data.selectedRoomId,
        calendarType: "month",
        month: monthToUrlDate(newMonthStart),
        categoryId: state.data.categoryId,
      });
    }
  };

  const handleDateClick = (date: Date) => {
    if (!state.data.selectedRoomId) return; // Только для конкретной бани
    
    setSelectedDate(date);
    const dateStr = format(date, "yyyy-MM-dd");
    updateUrl({
      step: "bani",
      mode: "single",
      roomId: state.data.selectedRoomId,
      date: dateStr,
      categoryId: state.data.categoryId,
    });
  };

  const handleDateClickFromWeekly = (roomId: string, date: Date) => {
    // Находим баню по ID
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    // Устанавливаем месяц календаря на месяц выбранной даты
    const monthStart = startMonth(date);
    setCalendarMonthStart(monthStart);

    // Выбираем баню и дату
    setState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        selectedRoomId: roomId,
        allRoomsSelected: false,
      },
    }));

    setSelectedDate(date);
    const dateStr = format(date, "yyyy-MM-dd");
    
    // Обновляем URL
    updateUrl({
      step: "bani",
      mode: "single",
      roomId: roomId,
      date: dateStr,
      month: monthToUrlDate(monthStart),
      categoryId: state.data.categoryId,
    });
  };

  const handleSlotClick = (slot: RoomTimeSlot, index: number) => {
    // Если индекс -1, значит снимаем выбор
    if (index === -1) {
      setSelectedSlotIndex(null);
      setGuestCount(1); // Сбрасываем количество гостей
    } else {
      setSelectedSlotIndex(index);
      // Устанавливаем минимальное количество гостей (1) при выборе нового слота
      setGuestCount(1);
    }
  };

  const handleGuestCountChange = (count: number) => {
    setGuestCount(count);
  };

  const handleContinue = () => {
    if (selectedSlotIndex === null || !selectedRoom) return;
    
    const selectedSlot = timeSlots[selectedSlotIndex];
    // eslint-disable-next-line no-console
    console.log("Продолжить бронирование:", {
      slot: selectedSlot,
      guestCount,
      roomId: selectedRoom.id,
      date: selectedDate,
    });
    
    // TODO: Переход на следующий шаг бронирования
    if (onShowToast) {
      onShowToast(`Переход к бронированию: ${selectedSlot.timeFrom} - ${selectedSlot.timeTo}, ${guestCount} ${guestCount === 1 ? "гость" : guestCount < 5 ? "гостя" : "гостей"}`);
    }
  };

  // Сбрасываем выбор слота при смене даты или бани
  useEffect(() => {
    setSelectedSlotIndex(null);
    setGuestCount(1);
  }, [selectedDate, state.data.selectedRoomId]);

  return (
    <div>
      <h3 className="stepper-widget__title">Выбор бани</h3>
      <p className="stepper-widget__sub">
        Выберите баню из списка или выберите все бани.
      </p>

      {isLoading ? (
        <div className="stepper-widget__rooms-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="stepper-widget__room-card-skeleton">
              <div className="stepper-widget__room-card-skeleton-shimmer" />
            </div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="stepper-widget__note">Нет доступных бань</div>
      ) : (
        <>
          {/* Аккордеон для выбора бани */}
          <div className="stepper-widget__accordion">
            <button
              type="button"
              className="stepper-widget__accordion-header"
              onClick={() => setIsAccordionOpen(!isAccordionOpen)}
            >
              <span className="stepper-widget__accordion-title">
                {selectedRoom
                  ? `Выбрана баня: ${selectedRoom.name}`
                  : state.data.allRoomsSelected
                  ? "Выбраны все бани"
                  : "Выберите баню"}
              </span>
              <svg
                className={`stepper-widget__accordion-icon ${
                  isAccordionOpen ? "stepper-widget__accordion-icon--open" : ""
                }`}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            
            {isAccordionOpen && (
              <div className="stepper-widget__accordion-content">
                <div className="stepper-widget__rooms-scroll">
                  {/* Плашка "Все бани" в начале списка */}
                  <button
                    type="button"
                    className={`stepper-widget__room-card stepper-widget__room-card--all ${
                      state.data.allRoomsSelected
                        ? "stepper-widget__room-card--selected"
                        : ""
                    }`}
                    onClick={handleAllRoomsClick}
                  >
                    <div className="stepper-widget__room-card-bg" />
                    <div className="stepper-widget__room-card-placeholder stepper-widget__room-card-placeholder--all">
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                      </svg>
                    </div>
                    <div className="stepper-widget__room-card-content">
                      <span className="stepper-widget__room-card-title">Все бани</span>
                    </div>
                  </button>

                  {/* Карточки бань */}
                  {rooms.map((room) => {
                    const firstImage = room.images?.[0];
                    const imageUrl = getImageUrl(firstImage);
                    const hasImageError = imageUrl && imageErrors.has(imageUrl);
                    const isImageLoading = imageUrl && loadingImages.has(imageUrl);
                    const isSelected = state.data.selectedRoomId === room.id;

                    return (
                      <button
                        key={room.id}
                        type="button"
                        className={`stepper-widget__room-card ${
                          isSelected ? "stepper-widget__room-card--selected" : ""
                        }`}
                        onClick={() => handleRoomClick(room)}
                      >
                        {imageUrl && !hasImageError && (
                          <>
                            {isImageLoading && (
                              <div className="stepper-widget__room-card-skeleton-shimmer" />
                            )}
                            <img
                              src={imageUrl}
                              alt={room.name}
                              className="stepper-widget__room-card-image"
                              onLoadStart={() => handleImageLoadStart(imageUrl)}
                              onLoad={() => handleImageLoad(imageUrl)}
                              onError={() => handleImageError(imageUrl)}
                              style={{ display: isImageLoading ? "none" : "block" }}
                            />
                          </>
                        )}
                        {(!imageUrl || hasImageError) && (
                          <div className="stepper-widget__room-card-placeholder">
                            <svg
                              width="48"
                              height="48"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <path d="M21 15l-5-5L5 21" />
                            </svg>
                          </div>
                        )}
                        <div className="stepper-widget__room-card-bg" />
                        <div className="stepper-widget__room-card-content">
                          <span className="stepper-widget__room-card-title">
                            {room.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Календарь или слоты в зависимости от выбора */}
          {hasSelection && (
            <div className="stepper-widget__calendar-container">
              {/* Показываем слоты, если выбрана дата */}
              {selectedDate && state.data.selectedRoomId && selectedRoom ? (
                <>
                  <div className="stepper-widget__slots-header">
                    <button
                      type="button"
                      className="stepper-widget__btn stepper-widget__btn--ghost"
                      onClick={() => {
                        setSelectedDate(null);
                        // Возвращаемся к месячному календарю для выбранной бани
                        updateUrl({
                          step: "bani",
                          mode: "single",
                          roomId: state.data.selectedRoomId!,
                          calendarType: "month",
                          month: monthToUrlDate(calendarMonthStart),
                          categoryId: state.data.categoryId,
                        });
                      }}
                    >
                      ← Назад к календарю
                    </button>
                  </div>
                  <TimeSlots
                    slots={timeSlots}
                    date={selectedDate}
                    roomName={selectedRoom.name}
                    roomId={selectedRoom.id}
                    isLoading={isLoadingSlots}
                    hasError={hasSlotsError}
                    selectedSlotIndex={selectedSlotIndex}
                    onSlotClick={handleSlotClick}
                  />
                  
                  {/* Нижняя панель выбора гостей */}
                  {selectedSlotIndex !== null && timeSlots[selectedSlotIndex] && (
                    <SlotSelectionPanel
                      selectedSlot={timeSlots[selectedSlotIndex]}
                      guestCount={guestCount}
                      maxGuests={selectedRoom.maxCapacity || selectedRoom.capacity || 10}
                      onGuestCountChange={handleGuestCountChange}
                      onContinue={handleContinue}
                    />
                  )}
                </>
              ) : (
                <>
                  {/* Показываем календарь, если не выбрана дата */}
                  {state.data.allRoomsSelected && (
                    <WeeklyCalendar
                      data={weeklyData}
                      initialDate={calendarWeekStart}
                      onWeekChange={handleWeekChange}
                      isLoading={isLoadingWeekly}
                      loadingRooms={loadingRooms}
                      errorRooms={errorRooms}
                      onDateClick={handleDateClickFromWeekly}
                      selectedDate={selectedDate}
                      selectedRoomId={state.data.selectedRoomId || null}
                    />
                  )}
                  {state.data.selectedRoomId && selectedRoom && (
                    <MonthlyCalendar
                      data={monthlyData}
                      roomName={selectedRoom.name}
                      initialDate={calendarMonthStart}
                      onMonthChange={handleMonthChange}
                      isLoading={isLoadingMonthly}
                      hasError={hasMonthlyError}
                      onDateClick={handleDateClick}
                      selectedDate={selectedDate}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

