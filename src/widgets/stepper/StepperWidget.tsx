import React, { useEffect, useMemo, useState } from "react";
import { Home, LogOut } from "lucide-react";
import "./stepper.css";
import type { StepId, StepperBookingGate, StepperState } from "./types";
import { createStepperSteps } from "./steps/steps";
import { createWidgetApi, WidgetApiError } from "../../api";
import { cn } from "../../lib/utils";
import { Toast } from "./ui/Toast";
import { parseUrlState } from "./utils/urlSync";
import { AuthModal } from "./auth/AuthModal";
import { CabinetModal } from "./auth/CabinetModal";
import { WidgetAuthProvider } from "./auth/AuthContext";
import { BookingFlowProvider, useBookingFlow } from "./booking/BookingFlowContext";
import {
  clearAuthSession,
  readAuthSession,
  writeAuthSession,
} from "./auth/auth.utils";

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
  state: StepperState,
  gate: StepperBookingGate
): StepperState {
  const current = steps.find((s) => s.id === state.stepId);
  if (!current) return { ...state, stepId: steps[0].id };
  if (!current.canEnter) return state;
  if (current.canEnter(state, gate)) return state;
  return { ...state, stepId: steps[0].id };
}

function BookingStepGuard({
  steps,
  state,
  setState,
}: {
  steps: ReturnType<typeof createStepperSteps>;
  state: StepperState;
  setState: React.Dispatch<React.SetStateAction<StepperState>>;
}) {
  const booking = useBookingFlow();
  const gate = useMemo<StepperBookingGate>(
    () => ({
      categoryId: booking.categoryId,
      selectedRoomId: booking.selectedRoomId,
      allRoomsSelected: booking.allRoomsSelected,
      draft: booking.draft,
    }),
    [
      booking.categoryId,
      booking.selectedRoomId,
      booking.allRoomsSelected,
      booking.draft,
    ]
  );

  useEffect(() => {
    const safeState = clampToFirstEnterable(steps, state, gate);
    if (safeState.stepId !== state.stepId) setState(safeState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, state.stepId, state.data, gate]);

  return null;
}

export const StepperWidget: React.FC<StepperWidgetProps> = ({
  alias,
  title = "Бронирование",
  initialStepId = "category",
}) => {
  const steps = useMemo(() => createStepperSteps(), []);
  const api = useMemo(() => createWidgetApi({ alias }), [alias]);

  const [state, setState] = useState<StepperState>(() => {
    const urlState = parseUrlState();
    const baseState: StepperState = { ...DEFAULT_STATE, stepId: initialStepId };

    if (urlState.step === "bani" || urlState.widgetStep === "2") {
      baseState.stepId = "banyaObject";
    }

    return baseState;
  });

  const [toast, setToast] = useState<string | null>(null);
  const [isAuthOpen, setAuthOpen] = useState(false);
  const [view, setView] = useState<"widget" | "cabinet">("widget");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthBootstrapping, setAuthBootstrapping] = useState(false);
  const [authUser, setAuthUser] = useState<Awaited<
    ReturnType<typeof api.getUserInfo>
  > | null>(null);

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
  }, [api]);

  useEffect(() => {
    let alive = true;
    const bootstrapAuth = async () => {
      const session = readAuthSession();
      if (!session?.token) return;
      setAuthBootstrapping(true);
      api.setToken(session.token);
      try {
        const freshUser = await api.getUserInfo();
        if (!alive) return;
        setAuthToken(session.token);
        setAuthUser(freshUser);
        writeAuthSession({
          token: session.token,
          userInfo: freshUser,
        });
      } catch {
        if (!alive) return;
        clearAuthSession();
        api.setToken(null);
        setAuthToken(null);
        setAuthUser(null);
      } finally {
        if (alive) setAuthBootstrapping(false);
      }
    };
    void bootstrapAuth();
    return () => {
      alive = false;
    };
  }, [api]);

  const current = steps.find((s) => s.id === state.stepId) ?? steps[0];

  const goTo = (stepId: StepId) => {
    setState((prev) => ({ ...prev, stepId }));
  };

  const back = () => {
    const idx = steps.findIndex((s) => s.id === state.stepId);
    const prev = idx > 0 ? steps[idx - 1] : null;
    if (!prev) return;
    goTo(prev.id);
  };

  const idx = Math.max(0, steps.findIndex((s) => s.id === state.stepId));
  const stepLabelText =
    view === "cabinet" ? "Профиль пользователя" : `Шаг ${idx + 1} из ${steps.length}`;
  const StepBody = current.Component;
  const centerTitle = view === "cabinet" ? "Личный кабинет" : current.title;

  const handleAuthSuccess = (args: {
    token: string | null;
    userInfo: Awaited<ReturnType<typeof api.getUserInfo>>;
  }) => {
    api.setToken(args.token);
    setAuthToken(args.token);
    setAuthUser(args.userInfo);
    writeAuthSession({
      token: args.token,
      userInfo: args.userInfo,
    });
    setToast("Вы успешно авторизованы");
  };

  const handleLogout = () => {
    clearAuthSession();
    api.setToken(null);
    setAuthToken(null);
    setAuthUser(null);
    setView("widget");
    setToast("Вы вышли из профиля");
  };

  return (
    <WidgetAuthProvider
      value={{
        token: authToken,
        user: authUser,
        isBootstrapping: isAuthBootstrapping,
      }}
    >
      <BookingFlowProvider config={state.data.config}>
        <BookingStepGuard steps={steps} state={state} setState={setState} />
      <div
        className={cn(
          "stepper-widget stepper-widget--layout",
          "w-full",
          /* На телефоне не тянем оболочку на весь экран — иначе flex-1 у шага даёт пустоту под контентом (Safari). */
          "min-h-0 md:min-h-[95dvh] md:min-h-[95vh]"
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
              "border-b border-gray-200/90 bg-white/95 pb-3 mb-2 pt-1 backdrop-blur-md supports-[backdrop-filter]:bg-white/90"
            )}
          >
            <div className="widget-header w-full">
              <button
                type="button"
                className="widget-header__back"
                onClick={() => {
                  if (view === "cabinet") {
                    setView("widget");
                    return;
                  }
                  back();
                }}
                disabled={view === "widget" && idx === 0}
                aria-disabled={view === "widget" && idx === 0}
                aria-label={view === "cabinet" ? "На главный экран виджета" : "Назад"}
                title={view === "cabinet" ? "На главный экран виджета" : "Назад"}
              >
                {view === "cabinet" ? <Home size={16} /> : "←"}
              </button>
              <div className="widget-header__center ">
                <p className="stepper-widget__sub">{stepLabelText}</p>
                <h3 className="stepper-widget__title">{centerTitle}</h3>
       
              </div>
              <div className="widget-header__auth">
                {authUser ? (
                  <>
                    <button
                    type="button"
                    className="stepper-widget__btn stepper-widget__btn--ghost shrink-0"
                    onClick={() => setView("cabinet")}
                    >
                      <span className="widget-user-pill">
                        <span className="widget-user-pill__avatar">
                          {(authUser.displayName ?? "U")[0]?.toUpperCase()}
                        </span>
                        <span>{authUser.displayName ?? "Профиль"}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="widget-header__logout"
                      onClick={handleLogout}
                      aria-label="Выйти из профиля"
                      title="Выйти из профиля"
                    >
                      <LogOut size={16} />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="stepper-widget__btn stepper-widget__btn--ghost shrink-0"
                    onClick={() => setAuthOpen(true)}
                  >
                    Войти
                  </button>
                )}
              </div>
            </div>
          </header>

          <div className="stepper-widget__step flex min-h-0 flex-col px-0 pb-3 pt-1 md:flex-1 md:px-1">
            {view === "cabinet" && authUser ? (
              <CabinetModal
                user={authUser}
                api={api}
                onBack={() => setView("widget")}
                onLogout={handleLogout}
                onShowToast={setToast}
              />
            ) : (
              <StepBody
                state={state}
                setState={setState}
                goTo={goTo}
                onShowToast={setToast}
                alias={alias}
                onAuthResolved={handleAuthSuccess}
                onOpenCabinet={() => setView("cabinet")}
              />
            )}
          </div>
        </div>
      </div>
      <AuthModal
        open={isAuthOpen}
        api={api}
        onClose={() => setAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </BookingFlowProvider>
    </WidgetAuthProvider>
  );
};
