import React, { useMemo, useState, useEffect, useRef } from "react";
import { startOfWeek as startWeek, startOfMonth as startMonth } from "date-fns";
import type { WidgetRoom } from "../../../api";
import { createWidgetApi } from "../../../api";
import type { StepProps } from "./stepTypes";
import { WeeklyCalendar, MonthlyCalendar, TimeSlots } from "../calendar";
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
import { ru } from "date-fns/locale";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent } from "../../../components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../components/ui/accordion";
import { BanyaRoomPicker } from "./BanyaRoomPicker";
import { urlInitialAccordionOpenForBanyaPicker } from "../utils/banyaUrl";

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

function formatTimeRange(timeFrom: string, timeTo: string): string {
  if (timeTo === "23:59") {
    return `${timeFrom} — до 24:00`;
  }
  return `${timeFrom} — ${timeTo}`;
}

export const StepBanyaObject: React.FC<StepProps> = ({
  state,
  setState,
  goTo,
  onShowToast,
  alias = "les",
}) => {
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
  const [accordionOpen, setAccordionOpen] = useState(urlInitialAccordionOpenForBanyaPicker);
  const [calendarAccordionOpen, setCalendarAccordionOpen] = useState(true);
  const [slotsAccordionOpen, setSlotsAccordionOpen] = useState(false);
  const prevSelectedDateRef = useRef<Date | null>(null);
  const prevSlotsEnabledRef = useRef(false);
  const prevSlotIndexRef = useRef<number | null>(null);

  const api = useMemo(() => createWidgetApi({ alias }), [alias]);

  const rooms = useMemo<WidgetRoom[]>(() => {
    const config = state.data.config;
    if (!config || !Array.isArray(config.rooms)) return [];
    return config.rooms;
  }, [state.data.config]);

  const tenantId = state.data.config?.settings?.tenantId ?? null;

  const selectedRoom = useMemo<WidgetRoom | null>(() => {
    if (!state.data.selectedRoomId) return null;
    return rooms.find((r) => r.id === state.data.selectedRoomId) || null;
  }, [rooms, state.data.selectedRoomId]);

  const slotsEnabled = Boolean(
    state.data.selectedRoomId && selectedDate && selectedRoom
  );

  useEffect(() => {
    const prev = prevSelectedDateRef.current;
    if (selectedDate && !prev) {
      setCalendarAccordionOpen(false);
    }
    if (!selectedDate && prev) {
      setCalendarAccordionOpen(true);
    }
    prevSelectedDateRef.current = selectedDate;
  }, [selectedDate]);

  useEffect(() => {
    const was = prevSlotsEnabledRef.current;
    if (slotsEnabled && !was) {
      setSlotsAccordionOpen(true);
    }
    if (!slotsEnabled) {
      setSlotsAccordionOpen(false);
    }
    prevSlotsEnabledRef.current = slotsEnabled;
  }, [slotsEnabled]);

  useEffect(() => {
    const prev = prevSlotIndexRef.current;
    if (selectedSlotIndex !== null && prev === null) {
      setSlotsAccordionOpen(false);
    }
    if (selectedSlotIndex === null && prev !== null && slotsEnabled) {
      setSlotsAccordionOpen(true);
    }
    prevSlotIndexRef.current = selectedSlotIndex;
  }, [selectedSlotIndex, slotsEnabled]);

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
      setState({
        ...state,
        data: {
          ...state.data,
          selectedRoomId: urlState.roomId,
          allRoomsSelected: false,
        },
      });
    } else if (urlState.mode === "all" && !state.data.allRoomsSelected) {
      setState({
        ...state,
        data: {
          ...state.data,
          allRoomsSelected: true,
          selectedRoomId: undefined,
        },
      });
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
    setAccordionOpen(false);
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
    setAccordionOpen(true);
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
    setState({
      ...state,
      data: {
        ...state.data,
        selectedRoomId: roomId,
        allRoomsSelected: false,
      },
    });

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
    setAccordionOpen(false);
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
    if (selectedSlotIndex === null || !selectedRoom || !selectedDate) return;

    const selectedSlot = timeSlots[selectedSlotIndex];

    setState({
      ...state,
      data: {
        ...state.data,
        bookingDraft: {
          roomId: selectedRoom.id,
          roomName: selectedRoom.name,
          date: format(selectedDate, "yyyy-MM-dd"),
          timeFrom: selectedSlot.timeFrom,
          timeTo: selectedSlot.timeTo,
          basePrice: selectedSlot.price,
          guestCount,
          productQuantities: {},
        },
      },
    });
    goTo("bookingStepThree");
  };

  // Сбрасываем выбор слота при смене даты или бани
  useEffect(() => {
    setSelectedSlotIndex(null);
    setGuestCount(1);
  }, [selectedDate, state.data.selectedRoomId]);

  const maxGuests = selectedRoom
    ? selectedRoom.maxCapacity || selectedRoom.capacity || 10
    : 10;
  const selectedSlot =
    selectedSlotIndex !== null && timeSlots[selectedSlotIndex]
      ? timeSlots[selectedSlotIndex]
      : null;
  const canSubmit = Boolean(selectedRoom && selectedDate && selectedSlot);
  const banyaSummary =
    state.data.allRoomsSelected && !state.data.selectedRoomId
      ? "Все бани"
      : selectedRoom?.name ?? "—";
  const dateSummary = selectedDate
    ? format(selectedDate, "d MMMM yyyy", { locale: ru })
    : "—";
  const slotSummary = selectedSlot
    ? formatTimeRange(selectedSlot.timeFrom, selectedSlot.timeTo)
    : "—";

  return (
    <div className="space-y-5">
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-lg border bg-slate-100" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-slate-600">Нет доступных бань</CardContent>
        </Card>
      ) : (
        <div className="booking-step-three relative flex min-h-0 w-full flex-1 flex-col">
          <div className="booking-step-three__scroll-main space-y-5">
            <BanyaRoomPicker
              rooms={rooms}
              tenantId={tenantId}
              allRoomsSelected={!!state.data.allRoomsSelected}
              selectedRoomId={state.data.selectedRoomId}
              showAllOption
              accordionOpen={accordionOpen}
              onAccordionOpenChange={setAccordionOpen}
              onSelectAll={handleAllRoomsClick}
              onSelectRoom={handleRoomClick}
            />

            {hasSelection ? (
              <>
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <Accordion
                    type="single"
                    collapsible
                    value={calendarAccordionOpen ? "cal" : ""}
                    onValueChange={(v) => setCalendarAccordionOpen(v === "cal")}
                  >
                    <AccordionItem value="cal" className="border-b-0">
                      <AccordionTrigger className="px-3 py-2.5 text-sm hover:no-underline sm:px-4">
                        <div className="flex w-full flex-col items-start gap-0.5 text-left">
                          {/* <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Дата
                          </span> */}
                          <h3 className="text-base font-semibold tracking-tight text-[#485548] sm:text-lg">
                         {"Дата: "}
                            {selectedDate
                              ? format(selectedDate, "d MMMM yyyy", { locale: ru })
                              : "Выбор даты"}
                          </h3>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-2 pb-3 pt-0 sm:px-3">
                        {state.data.allRoomsSelected ? (
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
                        ) : null}
                        {state.data.selectedRoomId && selectedRoom ? (
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
                        ) : null}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                {slotsEnabled ? (
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <Accordion
                      type="single"
                      collapsible
                      value={slotsAccordionOpen ? "slots" : ""}
                      onValueChange={(v) => setSlotsAccordionOpen(v === "slots")}
                    >
                      <AccordionItem value="slots" className="border-b-0">
                        <AccordionTrigger className="px-3 py-2.5 text-sm hover:no-underline sm:px-4">
                          <div className="flex w-full flex-col items-start gap-0.5 text-left">
                            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            
                            </span>
                            <h3 className="text-base font-semibold tracking-tight text-[#485548] sm:text-lg">

<span  style={{ color: "red" }}>{"Время: "}</span>
                           
                            
                              {selectedSlot
                                ? formatTimeRange(selectedSlot.timeFrom, selectedSlot.timeTo)
                                : "Выбор слота"}
                            </h3>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-2 pb-3 pt-0 sm:px-3">
                          {selectedRoom && selectedDate ? (
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
                          ) : null}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm opacity-60">
                    <div className="pointer-events-none flex flex-col gap-0.5 px-3 py-2.5 sm:px-4">
                     
                      <h3 className="text-base font-semibold tracking-tight text-slate-500 sm:text-lg">
                      <span>
                       {"Время: "}
                      </span>

                        Сначала выберите баню и дату
                      </h3>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          <footer className="booking-step-three__footer space-y-3">
            {/* <div className="grid gap-2 text-sm text-slate-700">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Баня
                </span>
                <span className="text-right font-semibold text-slate-800">{banyaSummary}</span>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Дата
                </span>
                <span className="text-right font-semibold text-slate-800">{dateSummary}</span>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Слот
                </span>
                <span className="text-right font-semibold text-slate-800">{slotSummary}</span>
              </div>
              {selectedSlot ? (
                <div className="text-right text-base font-bold text-slate-800">
                  {selectedSlot.price.toLocaleString("ru-RU")} ₽
                </div>
              ) : null}
            </div> */}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Гости
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleGuestCountChange(guestCount - 1)}
                    disabled={!selectedSlot || guestCount <= 1}
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
                    onClick={() => handleGuestCountChange(guestCount + 1)}
                    disabled={!selectedSlot || guestCount >= maxGuests}
                    aria-label="Увеличить количество гостей"
                  >
                    +
                  </Button>
                  <span className="text-xs text-slate-500">(макс. {maxGuests})</span>
                </div>
              </div>
              <Button
                type="button"
                className="h-11 shrink-0 rounded-xl bg-slate-800 px-6 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40 sm:min-w-40"
                onClick={handleContinue}
                disabled={!canSubmit}
              >
                Оформить
              </Button>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
};

