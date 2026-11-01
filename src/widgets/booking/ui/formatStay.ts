import { format, parseISO } from "date-fns";

/** "2026-10-26" → "26.10.2026" */
export function formatDateDots(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd.MM.yyyy");
  } catch {
    return dateStr;
  }
}

/** "2026-10-26" + "16:00" → "26.10.2026 16:00"; без времени — только дата. */
export function formatStayDateTime(
  dateStr: string,
  time?: string | null
): string {
  const date = formatDateDots(dateStr);
  const hhmm = time?.trim().slice(0, 5);
  return hhmm ? `${date} ${hhmm}` : date;
}
