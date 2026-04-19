import { format, parse, startOfWeek, startOfMonth } from "date-fns";

export type UrlState = {
  step?: "main" | "bani";
  mode?: "all" | "single";
  roomId?: string;
  calendarType?: "week" | "month";
  date?: string; // yyyy-MM-dd для выбранной даты (для слотов)
  week?: string; // yyyy-MM-dd для недели
  month?: string; // yyyy-MM для месяца
  categoryId?: "banya" | "homes";
  /** HH:mm — только чтение при загрузке, в процессе работы виджета URL не обновляем */
  timeFrom?: string;
  timeTo?: string;
  /** query step=2 — подсказка для виджета (шаг выбора бани) */
  widgetStep?: string;
};

/**
 * Парсит URL и возвращает состояние
 */
export function parseUrlState(): UrlState {
  const path = window.location.pathname;
  const search = new URLSearchParams(window.location.search);

  const state: UrlState = {};

  // Парсим путь
  if (path === "/main" || path === "/") {
    state.step = "main";
  } else if (path.startsWith("/bani")) {
    state.step = "bani";
    const parts = path.split("/");
    if (parts.length > 2 && parts[2] !== "all") {
      state.roomId = parts[2];
      state.mode = "single";
    } else {
      state.mode = "all";
    }
  }

  // Парсим query параметры
  const week = search.get("week");
  const month = search.get("month");
  const date = search.get("date");
  const category = search.get("category");
  const roomIdQuery = search.get("roomId");
  const timeFrom = search.get("timeFrom");
  const timeTo = search.get("timeTo");
  const stepParam = search.get("step")?.trim();

  if (date) {
    state.date = date;
  }

  if (timeFrom) state.timeFrom = timeFrom;
  if (timeTo) state.timeTo = timeTo;
  if (stepParam) state.widgetStep = stepParam;
  if (stepParam === "2") state.step = state.step ?? "bani";

  if (roomIdQuery) {
    state.roomId = roomIdQuery;
    state.mode = "single";
    state.step = state.step ?? "bani";
  }
  
  if (week) {
    state.calendarType = "week";
    state.week = week;
  } else if (month) {
    state.calendarType = "month";
    state.month = month;
  }

  if (category === "banya" || category === "homes") {
    state.categoryId = category;
  }

  const banya = search.get("banya");
  if (state.step === "bani" && banya === "all") {
    state.mode = "all";
    state.roomId = undefined;
  } else if (state.step === "bani" && banya) {
    state.mode = "single";
    state.roomId = banya;
  }

  return state;
}

/** Ссылка для тестов: текущий origin + pathname + query (виджет не пишет URL сам) */
export function buildWidgetBookingShareUrl(params: {
  roomId?: string;
  date?: string;
  timeFrom?: string;
  timeTo?: string;
}): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  const pathname = window.location.pathname || "/";
  const sp = new URLSearchParams();
  sp.set("step", "2");
  if (params.roomId) sp.set("roomId", params.roomId);
  if (params.date) sp.set("date", params.date);
  if (params.timeFrom) sp.set("timeFrom", params.timeFrom);
  if (params.timeTo) sp.set("timeTo", params.timeTo);
  return `${origin}${pathname}?${sp.toString()}`;
}

/**
 * Обновляет URL на основе состояния
 * @deprecated Виджет больше не синхронизирует состояние в URL при навигации; оставлено для совместимости при необходимости.
 */
export function updateUrl(state: UrlState): void {
  let path = "/main";
  const search = new URLSearchParams();

  if (state.step === "bani") {
    if (state.mode === "all") {
      path = "/bani/all";
    } else if (state.roomId) {
      path = `/bani/${state.roomId}`;
    } else {
      path = "/bani";
    }

    if (state.date) {
      search.set("date", state.date);
    }
    
    if (state.calendarType === "week" && state.week) {
      search.set("week", state.week);
    } else if (state.calendarType === "month" && state.month) {
      search.set("month", state.month);
    }
  }

  if (state.categoryId) {
    search.set("category", state.categoryId);
  }

  if (state.step === "bani") {
    if (state.mode === "all") {
      search.set("banya", "all");
    } else if (state.roomId) {
      search.set("banya", state.roomId);
    }
  }

  const newUrl = `${path}${search.toString() ? `?${search.toString()}` : ""}`;
  window.history.pushState({}, "", newUrl);
}

/**
 * Преобразует дату начала недели в строку для URL
 */
export function weekToUrlDate(date: Date): string {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  return format(weekStart, "yyyy-MM-dd");
}

/**
 * Преобразует строку из URL в дату начала недели
 */
export function urlDateToWeek(dateStr: string): Date {
  return startOfWeek(parse(dateStr, "yyyy-MM-dd", new Date()), {
    weekStartsOn: 1,
  });
}

/**
 * Преобразует месяц в строку для URL
 */
export function monthToUrlDate(date: Date): string {
  return format(startOfMonth(date), "yyyy-MM");
}

/**
 * Преобразует строку из URL в дату начала месяца
 */
export function urlDateToMonth(dateStr: string): Date {
  return startOfMonth(parse(dateStr, "yyyy-MM", new Date()));
}
