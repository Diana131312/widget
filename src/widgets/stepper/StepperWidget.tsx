import React, { useEffect, useMemo, useState } from "react";
import "./stepper.css";
import type { StepId, StepperState } from "./types";
import { createStepperSteps } from "./steps/steps";
import { createWidgetApi, WidgetApiError } from "../../api";
import { Toast } from "./ui/Toast";
import { parseUrlState, updateUrl } from "./utils/urlSync";

export type StepperWidgetProps = {
  /** tenant alias для Widget API */
  alias: string;
  /** Заголовок виджета */
  title?: string;
  /** Стартовый шаг */
  initialStepId?: StepId;
};

const DEFAULT_STATE: StepperState = {
  stepId: "category",
  data: {},
};

function clampToFirstEnterable(
  steps: ReturnType<typeof createStepperSteps>,
  state: StepperState
): StepperState {
  const current = steps.find((s) => s.id === state.stepId);
  if (!current) return { ...state, stepId: steps[0].id };
  if (!current.canEnter) return state;
  if (current.canEnter(state)) return state;
  return { ...state, stepId: steps[0].id };
}

export const StepperWidget: React.FC<StepperWidgetProps> = ({
  alias,
  title = "Бронирование",
  initialStepId = "category",
}) => {
  const steps = useMemo(() => createStepperSteps(), []);
  
  // Восстановление состояния из URL при инициализации
  const [state, setState] = useState<StepperState>(() => {
    const urlState = parseUrlState();
    const baseState = { ...DEFAULT_STATE, stepId: initialStepId };
    
    if (urlState.step === "bani") {
      baseState.stepId = "banyaObject";
    }
    
    if (urlState.categoryId) {
      baseState.data.categoryId = urlState.categoryId;
    }
    
    if (urlState.mode === "all") {
      baseState.data.allRoomsSelected = true;
    } else if (urlState.roomId) {
      baseState.data.selectedRoomId = urlState.roomId;
    }
    
    return baseState;
  });
  
  const [toast, setToast] = useState<string | null>(null);
  
  // Синхронизация URL при изменении состояния
  useEffect(() => {
    if (state.stepId === "category") {
      updateUrl({ step: "main" });
    } else if (state.stepId === "banyaObject") {
      updateUrl({
        step: "bani",
        categoryId: state.data.categoryId,
        mode: state.data.allRoomsSelected ? "all" : state.data.selectedRoomId ? "single" : undefined,
        roomId: state.data.selectedRoomId,
      });
    }
  }, [state]);

  const showLoadErrorToast = () => {
    setToast("Ошибка загрузки данных. Проверьте подключение к интернету");
  };

  const logErrorDetails = (err: unknown, tag: string) => {
    const e = err as any;
    const type =
      err instanceof Error ? err.name : `NonError(${typeof err})`;
    const message =
      err instanceof Error ? err.message : JSON.stringify(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const status =
      err instanceof WidgetApiError ? err.status : e?.status ?? e?.statusCode;

    // eslint-disable-next-line no-console
    console.error(`[${tag}] API error details`, {
      type,
      status,
      message,
      stack,
      raw: err,
    });
  };

  // Шаг 1: инициализация данных виджета (settings + full config).
  useEffect(() => {
    let alive = true;
    const api = createWidgetApi({ alias });

    const loadSettings = async () => {
      try {
        const settings = await api.getThemeSettings();
        // eslint-disable-next-line no-console
        console.debug("📊 Settings response:", settings);
        if (!alive) return;
        setState((prev) => ({
          ...prev,
          data: { ...prev.data, settings },
        }));
      } catch (err) {
        showLoadErrorToast();
        logErrorDetails(err, "GET /settings/{alias}");
      }
    };

    const loadConfig = async () => {
      try {
        const config = await api.getConfig();
        // eslint-disable-next-line no-console
        console.debug("📦 Full config response:", config);
        if (!alive) return;
        setState((prev) => ({
          ...prev,
          data: { ...prev.data, config },
        }));
      } catch (err) {
        showLoadErrorToast();
        logErrorDetails(err, "GET /get/{alias}");
      }
    };

    // Параллельно (как требуется)
    void loadSettings();
    void loadConfig();

    return () => {
      alive = false;
    };
  }, [alias]);

  const current = steps.find((s) => s.id === state.stepId) ?? steps[0];
  // Guard (без setState в рендере)
  useEffect(() => {
    const safeState = clampToFirstEnterable(steps, state);
    if (safeState.stepId !== state.stepId) setState(safeState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, state.stepId, state.data]);

  const goTo = (stepId: StepId) => {
    setState((prev) => clampToFirstEnterable(steps, { ...prev, stepId }));
  };

  const back = () => {
    const idx = steps.findIndex((s) => s.id === state.stepId);
    const prev = idx > 0 ? steps[idx - 1] : null;
    if (!prev) return;
    goTo(prev.id);
  };

  const idx = Math.max(0, steps.findIndex((s) => s.id === state.stepId));
  const stepLabel = `${idx + 1}/${steps.length}`;

  return (
    <div className="stepper-widget">
      <div className="stepper-widget__card">
        <div className="stepper-widget__topbar">
          <div>
            <p className="stepper-widget__sub">{stepLabel}</p>
            <h3 className="stepper-widget__title">{title}</h3>
          </div>
          <button
            type="button"
            className="stepper-widget__btn stepper-widget__btn--ghost"
            onClick={back}
            disabled={idx === 0}
            aria-disabled={idx === 0}
          >
            Назад
          </button>
        </div>

        <current.Component
          state={state}
          setState={setState}
          goTo={goTo}
          onShowToast={setToast}
          alias={alias}
        />
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
};

