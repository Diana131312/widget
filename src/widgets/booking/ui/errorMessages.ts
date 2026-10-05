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

function bodyTextOf(error: unknown): string {
  if (!error || typeof error !== "object" || !("body" in error)) return "";
  const body = (error as { body: unknown }).body;
  if (typeof body === "string") return body;
  if (!body || typeof body !== "object") return "";
  const o = body as Record<string, unknown>;
  for (const key of ["message", "Message", "error", "Error", "title", "detail"]) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  try {
    return JSON.stringify(body);
  } catch {
    return "";
  }
}

/** Сообщение с бэка, если оно человекочитаемое. */
export function getApiBodyMessage(error: unknown): string | null {
  const text = bodyTextOf(error);
  if (!text) return null;
  // не показываем сырой JSON-объект
  if (text.startsWith("{") || text.startsWith("[")) return null;
  if (text.length > 280) return null;
  return text;
}

/**
 * Ошибки API с приоритетом текста из ответа (например «Время уже занято»).
 * Сеть/таймаут — дружелюбные тексты; иначе body.message или общий fallback.
 */
export function getWidgetApiErrorDetail(error: unknown): string {
  const apiMessage = getApiBodyMessage(error);
  if (apiMessage) return apiMessage;

  const network = getBootstrapErrorCopy(error);
  if (
    network.detail === "Проверьте интернет и попробуйте ещё раз" ||
    network.detail === "Слишком долгий ответ сервера"
  ) {
    return network.detail;
  }

  if (error instanceof Error && error.message && !error.message.startsWith("Widget API")) {
    return error.message;
  }

  return network.detail;
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

/** Ошибки POST /auth (проверка SMS-кода). */
export function getAuthErrorCopy(error: unknown): BootstrapErrorCopy {
  const status = statusOf(error);
  const msg = `${messageOf(error)} ${bodyTextOf(error)}`.toLowerCase();
  const network = getBootstrapErrorCopy(error);

  if (
    network.detail === "Проверьте интернет и попробуйте ещё раз" ||
    network.detail === "Слишком долгий ответ сервера" ||
    network.detail === "Сервис временно недоступен. Попробуйте позже"
  ) {
    return {
      title: "Не удалось подтвердить код",
      detail: network.detail,
    };
  }

  const looksLikeBadCode =
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 422 ||
    /неверн|invalid|wrong|incorrect|код|code|expired|истек/.test(msg);

  if (looksLikeBadCode) {
    return {
      title: "Неверный код",
      detail: "Неверный код подтверждения. Проверьте код и попробуйте ещё раз",
    };
  }

  return {
    title: "Не удалось подтвердить код",
    detail: "Не удалось подтвердить код. Попробуйте ещё раз",
  };
}
