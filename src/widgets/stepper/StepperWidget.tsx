import React, { useEffect, useMemo, useState } from "react";
import "./stepper.css";
import type { StepId, StepperState } from "./types";
import { createStepperSteps } from "./steps/steps";
import { createWidgetApi, WidgetApiError } from "../../api";
import { cn } from "../../lib/utils";
import { Toast } from "./ui/Toast";
import { parseUrlState, updateUrl } from "./utils/urlSync";

export type StepperWidgetProps = {
  alias: string;
  title?: string;
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
    } else if (state.stepId === "bookingStepThree" || state.stepId === "bookingStepFour") {
      const d = state.data.bookingDraft;
      updateUrl({
        step: "bani",
        categoryId: state.data.categoryId,
        mode: d?.roomId ? "single" : undefined,
        roomId: d?.roomId,
        date: d?.date,
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

  useEffect(() => {
    let alive = true;
    const api = createWidgetApi({ alias });

    const loadSettings = async () => {
      try {
        const settings = await api.getThemeSettings();
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

    void loadSettings();
    void loadConfig();

    return () => {
      alive = false;
    };
  }, [alias]);

  const current = steps.find((s) => s.id === state.stepId) ?? steps[0];
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
  const StepBody = current.Component;

  return (
    <>
      <div
        className={cn(
          "stepper-widget stepper-widget--layout",
          "w-full px-4 py-6 sm:px-6 md:px-6 md:py-8",
          "min-h-[100dvh] min-h-[100vh]"
        )}
      >
        <div
          className={cn(
            "stepper-widget__card mx-auto flex min-h-0 w-full max-w-[800px] flex-col overflow-x-clip overflow-y-visible rounded-2xl border border-gray-200 bg-white shadow-sm"
          )}
        >
          <header
            className={cn(
              "stepper-widget__topbar shrink-0",
              "border-b border-gray-200/90 bg-white/95 pb-3 pt-1 backdrop-blur-md supports-[backdrop-filter]:bg-white/90"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="stepper-widget__sub">{stepLabel}</p>
                <h3 className="stepper-widget__title">{title}</h3>
              </div>
              <button
                type="button"
                className="stepper-widget__btn stepper-widget__btn--ghost shrink-0"
                onClick={back}
                disabled={idx === 0}
                aria-disabled={idx === 0}
              >
                Назад
              </button>
            </div>
          </header>

          <div className="stepper-widget__step flex min-h-0 flex-1 flex-col px-0 pb-3 pt-1 md:px-1">
            <StepBody
              state={state}
              setState={setState}
              goTo={goTo}
              onShowToast={setToast}
              alias={alias}
            />
          </div>
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
};
