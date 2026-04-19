import React, { useMemo, useState, useEffect, useRef } from "react";
import { startOfWeek as startWeek, startOfMonth as startMonth } from "date-fns";
import type { WidgetRoom } from "../../../api";
import { createWidgetApi } from "../../../api";
import type { StepProps } from "./stepTypes";
import { WeeklyCalendar, MonthlyCalendar, TimeSlots } from "../calendar";
import { weekToUrlDate, urlDateToWeek, monthToUrlDate, urlDateToMonth } from "../utils/urlSync";
import { buildWidgetBookingShareUrl } from "../utils/urlSync";
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
import { Card, CardContent } from "../../../components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../components/ui/accordion";
import { BanyaRoomPicker } from "./BanyaRoomPicker";
import { useBookingFlow } from "../booking/BookingFlowContext";
import { Link2 } from "lucide-react";

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
  goTo,
  onShowToast,
  alias = "les",
}) => {
  const booking = useBookingFlow();
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
  const [accordionOpen, setAccordionOpen] = useState(true);
  const [calendarAccordionOpen, setCalendarAccordionOpen] = useState(true);
  const [slotsAccordionOpen, setSlotsAccordionOpen] = useState(true);
  const calendarSectionRef = useRef<HTMLDivElement>(null);
  const slotsSectionRef = useRef<HTMLDivElement>(null);

  const scrollToRef = (el: HTMLElement | null) => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 180);
    });
  };

  const api = useMemo(() => createWidgetApi({ alias }), [alias]);

  const rooms = useMemo<WidgetRoom[]>(() => {
    const config = state.data.config;
    if (!config || !Array.isArray(config.rooms)) return [];
    return config.rooms;
  }, [state.data.config]);

  const tenantId = state.data.config?.settings?.tenantId ?? null;

  const selectedRoom = useMemo<WidgetRoom | null>(() => {
    if (!booking.selectedRoomId) return null;
    return rooms.find((r) => r.id === booking.selectedRoomId) || null;
  }, [rooms, booking.selectedRoomId]);

  const isLoading = !state.data.config;

  // Авто-выбор «Все бани», если ничего не выбрано (без записи в URL)
  useEffect(() => {
    if (!isLoading && rooms.length > 0 && !booking.allRoomsSelected && !booking.selectedRoomId) {
      booking.ensureDefaultAllRoomsWhenEmpty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, rooms.length, booking.allRoomsSelected, booking.selectedRoomId]);

  // Синхронизация календаря из store (в т.ч. после возврата с шага 3)
  useEffect(() => {
    const ds = booking.draft?.date;
    if (!ds) {
      setSelectedDate(null);
      return;
    }
    const d = parse(ds, "yyyy-MM-dd", new Date());
    if (!isNaN(d.getTime())) setSelectedDate(d);
  }, [booking.draft?.date]);

  /** Месячный и недельный календари показывают период, в который попадает выбранная дата */
  useEffect(() => {
    const ds = booking.draft?.date;
    const fromDraft = ds ? parse(ds, "yyyy-MM-dd", new Date()) : null;
    const d =
      fromDraft && !isNaN(fromDraft.getTime())
        ? fromDraft
        : selectedDate && !isNaN(selectedDate.getTime())
          ? selectedDate
          : null;
    if (!d) return;
    setCalendarMonthStart(startMonth(d));
    setCalendarWeekStart(startWeek(d, { weekStartsOn: 1 }));
  }, [booking.draft?.date, selectedDate]);

  // Загружаем слоты при выборе даты
  useEffect(() => {
    if (!selectedDate || !booking.selectedRoomId || !selectedRoom) {
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
  }, [selectedDate, booking.selectedRoomId, selectedRoom, api]);

  // Цена слота из URL (timeFrom/timeTo без basePrice) после загрузки слотов
  useEffect(() => {
    const t1 = booking.draft?.timeFrom;
    const t2 = booking.draft?.timeTo;
    const bp = booking.draft?.basePrice;
    if (!t1 || !t2 || bp != null || !timeSlots.length) return;
    const slot = timeSlots.find((s) => s.timeFrom === t1 && s.timeTo === t2);
    if (slot) {
      booking.setSlotFromPick({
        timeFrom: slot.timeFrom,
        timeTo: slot.timeTo,
        basePrice: slot.price,
      });
    }
  }, [booking.draft?.timeFrom, booking.draft?.timeTo, booking.draft?.basePrice, timeSlots, booking]);

  // Восстановить выделенный слот по данным store
  useEffect(() => {
    const t1 = booking.draft?.timeFrom;
    const t2 = booking.draft?.timeTo;
    if (!t1 || !t2 || !timeSlots.length) return;
    const idx = timeSlots.findIndex((s) => s.timeFrom === t1 && s.timeTo === t2);
    if (idx >= 0) setSelectedSlotIndex(idx);
  }, [timeSlots, booking.draft?.timeFrom, booking.draft?.timeTo]);

  if (booking.categoryId !== "banya") {
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

    booking.selectSpecificRoom(room);

    // Показать SnackBar с названием выбранной бани
    if (onShowToast) {
      onShowToast(`Выбрана баня: ${room.name}`);
    }
    scrollToRef(calendarSectionRef.current);
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

    booking.selectAllRooms();
    scrollToRef(calendarSectionRef.current);
  };

  // Загружаем данные для недельного календаря (все бани)
  useEffect(() => {
    if (!booking.allRoomsSelected || rooms.length === 0) {
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
  }, [booking.allRoomsSelected, rooms, calendarWeekStart, api]);

  // Загружаем данные для месячного календаря (конкретная баня)
  useEffect(() => {
    if (!booking.selectedRoomId || !selectedRoom) {
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
  }, [booking.selectedRoomId, selectedRoom, calendarMonthStart, api]);

  const hasSelection = booking.allRoomsSelected || booking.selectedRoomId;

  const handleWeekChange = (newWeekStart: Date) => {
    setCalendarWeekStart(newWeekStart);
    setSelectedDate(null);
  };

  const handleMonthChange = (newMonthStart: Date) => {
    setCalendarMonthStart(newMonthStart);
    setSelectedDate(null);
  };

  const handleDateClick = (date: Date) => {
    if (!booking.selectedRoomId) return;

    setSelectedDate(date);
    const dateStr = format(date, "yyyy-MM-dd");
    booking.setDraftDate(dateStr);
    scrollToRef(slotsSectionRef.current);
  };

  const handleDateClickFromWeekly = (roomId: string, date: Date) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const dateStr = format(date, "yyyy-MM-dd");
    booking.applyWeeklyRoomAndDate(room, dateStr);
    scrollToRef(slotsSectionRef.current);
  };

  const handleSlotClick = (slot: RoomTimeSlot, index: number) => {
    if (index === -1) {
      setSelectedSlotIndex(null);
      booking.clearSlotPick();
    } else {
      setSelectedSlotIndex(index);
      booking.setSlotFromPick({
        timeFrom: slot.timeFrom,
        timeTo: slot.timeTo,
        basePrice: slot.price,
      });
    }
  };

  const handleContinue = () => {
    if (selectedSlotIndex === null || !selectedRoom || !selectedDate) return;

    const selectedSlot = timeSlots[selectedSlotIndex];
    const maxGuests = selectedRoom.maxCapacity ?? selectedRoom.capacity ?? 99;
    const prev = booking.draft;
    let guestCount = 1;
    if (prev?.roomId === selectedRoom.id && typeof prev.guestCount === "number" && prev.guestCount >= 1) {
      guestCount = Math.min(prev.guestCount, maxGuests);
    }

    booking.patchDraft({
      roomId: selectedRoom.id,
      roomName: selectedRoom.name,
      date: format(selectedDate, "yyyy-MM-dd"),
      timeFrom: selectedSlot.timeFrom,
      timeTo: selectedSlot.timeTo,
      basePrice: selectedSlot.price,
      guestCount,
    });
    booking.clearStep3Products();
    goTo("bookingStepThree");
  };

  const skipSlotClearOnMount = useRef(true);
  useEffect(() => {
    if (skipSlotClearOnMount.current) {
      skipSlotClearOnMount.current = false;
      return;
    }
    setSelectedSlotIndex(null);
  }, [selectedDate, booking.selectedRoomId]);
  const selectedSlot =
    selectedSlotIndex !== null && timeSlots[selectedSlotIndex]
      ? timeSlots[selectedSlotIndex]
      : null;
  const canSubmit = Boolean(selectedRoom && selectedDate && selectedSlot);
  const handleCopyWidgetUrl = async () => {
    const d = booking.draft;
    const url = buildWidgetBookingShareUrl({
      roomId: d?.roomId,
      date: d?.date,
      timeFrom: d?.timeFrom,
      timeTo: d?.timeTo,
    });
    try {
      await navigator.clipboard.writeText(url);
      onShowToast?.("Ссылка скопирована");
    } catch {
      onShowToast?.("Не удалось скопировать ссылку");
    }
  };

  const banyaSummary =
    booking.allRoomsSelected && !booking.selectedRoomId
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
              allRoomsSelected={!!booking.allRoomsSelected}
              selectedRoomId={booking.selectedRoomId}
              showAllOption
              accordionOpen={accordionOpen}
              onAccordionOpenChange={setAccordionOpen}
              onSelectAll={handleAllRoomsClick}
              onSelectRoom={handleRoomClick}
              headerAction={
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                  aria-label="Скопировать ссылку с выбором"
                  title="Ссылка на выбор (тест)"
                  onClick={() => void handleCopyWidgetUrl()}
                >
                  <Link2 className="h-4 w-4" />
                </button>
              }
            />

            {hasSelection ? (
              <>
                <div ref={calendarSectionRef} className="rounded-xl border border-slate-200 bg-white shadow-sm">
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
                        {booking.allRoomsSelected ? (
                          <WeeklyCalendar
                            data={weeklyData}
                            initialDate={calendarWeekStart}
                            onWeekChange={handleWeekChange}
                            isLoading={isLoadingWeekly}
                            loadingRooms={loadingRooms}
                            errorRooms={errorRooms}
                            onDateClick={handleDateClickFromWeekly}
                            selectedDate={selectedDate}
                            selectedRoomId={booking.selectedRoomId || null}
                          />
                        ) : null}
                        {booking.selectedRoomId && selectedRoom ? (
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

                <div ref={slotsSectionRef} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <Accordion
                    type="single"
                    collapsible
                    value={slotsAccordionOpen ? "slots" : ""}
                    onValueChange={(v) => setSlotsAccordionOpen(v === "slots")}
                  >
                    <AccordionItem value="slots" className="border-b-0">
                      <AccordionTrigger className="px-3 py-2.5 text-sm hover:no-underline sm:px-4">
                        <div className="flex w-full flex-col items-start gap-0.5 text-left">
                          <h3 className="text-base font-semibold tracking-tight text-[#485548] sm:text-lg">
                            <span className="text-[#485548]">Время: </span>
                            {selectedSlot
                              ? formatTimeRange(selectedSlot.timeFrom, selectedSlot.timeTo)
                              : "выбор слота"}
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
                        ) : (
                          <div
                            className="flex min-h-[17rem] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/90 px-4 py-6 text-center sm:min-h-[18rem]"
                            aria-live="polite"
                          >
                            <p className="max-w-sm text-sm leading-relaxed text-slate-600">
                              {!selectedDate
                                ? "Укажите дату в календаре выше — здесь появятся доступные интервалы."
                                : "Выберите баню и дату в календаре недели — затем отобразятся слоты."}
                            </p>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
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

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                className="h-11 w-full shrink-0 rounded-xl bg-slate-800 px-6 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40 sm:w-auto sm:min-w-40"
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

