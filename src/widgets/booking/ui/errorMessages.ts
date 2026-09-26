export type BootstrapErrorCopy = {
  title: string;
  detail: string;
};

const TITLE = "Не удалось загрузить данные";

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

function statusOf(error: unknown): number | null {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }
  return null;
}

/**
 * Человекочитаемые тексты для blocking-ошибки bootstrap (без сырого Failed to fetch).
 */
export function getBootstrapErrorCopy(error: unknown): BootstrapErrorCopy {
  const msg = messageOf(error).toLowerCase();
  const status = statusOf(error);
  const name = error instanceof Error ? error.name : "";

  if (
    name === "AbortError" ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("aborted")
  ) {
    return {
      title: TITLE,
      detail: "Слишком долгий ответ сервера",
    };
  }

  if (
    (status != null && status >= 500) ||
    msg.includes("unavailable") ||
    /\b5\d\d\b/.test(msg)
  ) {
    return {
      title: TITLE,
      detail: "Сервис временно недоступен. Попробуйте позже",
    };
  }

  if (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    (name === "TypeError" && (msg.includes("network") || msg.includes("fetch")))
  ) {
    return {
      title: TITLE,
      detail: "Проверьте интернет и попробуйте ещё раз",
    };
  }

  return {
    title: TITLE,
    detail: "Что-то пошло не так. Попробуйте ещё раз",
  };
}
