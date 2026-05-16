import React, { useMemo } from "react";
import type { WidgetRoom } from "../../../api";
import { createWidgetApi } from "../../../api";
import type { StepProps } from "./stepTypes";
import { useBookingFlow } from "../booking/BookingFlowContext";
import { BanyaTestCard } from "../banya-test";

export const StepBanyaTestObject: React.FC<StepProps> = ({
  state,
  goTo,
  alias = "les",
}) => {
  const booking = useBookingFlow();
  const api = useMemo(() => createWidgetApi({ alias }), [alias]);

  const rooms = useMemo<WidgetRoom[]>(() => {
    const config = state.data.config;
    if (!config?.rooms || !Array.isArray(config.rooms)) return [];
    return config.rooms;
  }, [state.data.config]);

  const tenantId = state.data.config?.settings?.tenantId ?? null;
  const isLoading = !state.data.config;

  if (booking.categoryId !== "banyaTest") {
    return (
      <div>
        <div className="stepper-widget__error">
          Этот шаг доступен только для категории «Бани тест».
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

  return (
    <div className="step-banya-test">
      <h3 className="stepper-widget__title">Выберите баню</h3>
      <p className="stepper-widget__sub">
        Выберите дату в календаре занятости и нажмите «Далее».
      </p>

      {isLoading ? (
        <div className="stepper-widget__note">Загрузка бань…</div>
      ) : rooms.length === 0 ? (
        <div className="stepper-widget__note">Нет доступных бань для бронирования.</div>
      ) : (
        <div className="daily-houses-list banya-test-list">
          {rooms.map((room) => (
            <BanyaTestCard
              key={room.id}
              room={room}
              api={api}
              tenantId={tenantId}
              onContinue={({ room: selectedRoom, date }) => {
                booking.patchDraft({
                  roomId: selectedRoom.id,
                  roomName: selectedRoom.name,
                  date,
                  guestCount: 0,
                  timeFrom: undefined,
                  timeTo: undefined,
                  slotDuration: undefined,
                  slotPrice: undefined,
                  slotLabel: undefined,
                  basePrice: undefined,
                });
                booking.clearStep3Products();
                goTo("bookingStepThree");
              }}
            />
          ))}
        </div>
      )}

      <div className="stepper-widget__grid step-banya-test__back">
        <button
          type="button"
          className="stepper-widget__btn stepper-widget__btn--ghost"
          onClick={() => goTo("category")}
        >
          Назад
        </button>
      </div>
    </div>
  );
};
