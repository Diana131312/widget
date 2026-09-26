import { useCallback, useEffect, useMemo, useState } from "react";
import { createWidgetApi } from "../../../api";
import type { WidgetGetResponse } from "../../../api";
import { BOOKING_ALIAS } from "../constants";
import type { BookingStepId } from "../types";
import { stepNeedsConfig } from "./stepRequirements";

export type BootstrapStatus = "idle" | "loading" | "ready" | "error";

type UseBookingBootstrapArgs = {
  stepId: BookingStepId;
  /** Для тестов можно подменить клиент */
  getConfig?: () => Promise<WidgetGetResponse>;
};

/**
 * Грузит конфиг виджета в фоне.
 * Блокирующий лоадер — только если текущему шагу нужен config (см. STEP_DATA_NEEDS).
 */
export function useBookingBootstrap({
  stepId,
  getConfig,
}: UseBookingBootstrapArgs) {
  const [config, setConfig] = useState<WidgetGetResponse | null>(null);
  const [status, setStatus] = useState<BootstrapStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async (signal: { cancelled: boolean }) => {
    setStatus("loading");
    setError(null);
    try {
      const fetcher =
        getConfig ??
        (() => createWidgetApi({ alias: BOOKING_ALIAS }).getConfig());
      const data = await fetcher();
      if (signal.cancelled) return;
      setConfig(data);
      setStatus("ready");
    } catch (err) {
      if (signal.cancelled) return;
      const next =
        err instanceof Error ? err : new Error("Не удалось загрузить конфиг");
      setError(next);
      setStatus("error");
    }
  }, [getConfig]);

  useEffect(() => {
    const signal = { cancelled: false };
    void load(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [load, reloadToken]);

  const reload = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  const needsConfig = stepNeedsConfig(stepId);
  const isBlocking =
    needsConfig && (status === "idle" || status === "loading");

  return useMemo(
    () => ({
      config,
      status,
      error,
      isBlocking,
      needsConfig,
      reload,
    }),
    [config, status, error, isBlocking, needsConfig, reload]
  );
}
