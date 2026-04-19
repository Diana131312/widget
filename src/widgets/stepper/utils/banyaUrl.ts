import { parseUrlState } from "./urlSync";

/** В URL явно указана одна баня (путь /bani/:id или query ?banya=, не all). */
export function urlHasExplicitSingleRoom(): boolean {
  if (typeof window === "undefined") return false;
  const u = parseUrlState();
  if (u.step !== "bani") return false;
  if (u.mode === "single" && u.roomId) return true;
  const b = new URLSearchParams(window.location.search).get("banya");
  return !!b && b !== "all";
}

/** Аккордион со списком плашек открыт по умолчанию, если нет явного выбора бани в URL. */
export function urlInitialAccordionOpenForBanyaPicker(): boolean {
  return !urlHasExplicitSingleRoom();
}
