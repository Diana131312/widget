import React, { useMemo } from "react";
import type { WidgetDailyRoom } from "../../../api";
import { createWidgetApi } from "../../../api";
import type { StepProps } from "./stepTypes";
import { useBookingFlow } from "../booking/BookingFlowContext";
import { DailyHouseCard } from "../daily";

export const StepHomesObject: React.FC<StepProps> = ({
  state,
  goTo,
  onShowToast,
  alias = "les",
}) => {
  const booking = useBookingFlow();
  const api = useMemo(() => createWidgetApi({ alias }), [alias]);

  const dailyRooms = useMemo<WidgetDailyRoom[]>(() => {
    const config = state.data.config;
    if (!config?.dailyRooms || !Array.isArray(config.dailyRooms)) return [];
    return config.dailyRooms;
  }, [state.data.config]);

  const tenantId = state.data.config?.settings?.tenantId ?? null;
  const isLoading = !state.data.config;

  if (booking.categoryId !== "homes") {
    return (
      <div>
        <div className="stepper-widget__error">
          Этот шаг доступен только для категории «Дома».
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
    <div className="step-homes">
      <h3 className="stepper-widget__title">Выберите дом</h3>
  

      {isLoading ? (
        <div className="stepper-widget__note">Загрузка домов…</div>
      ) : dailyRooms.length === 0 ? (
        <div className="stepper-widget__note">Нет доступных домов для бронирования.</div>
      ) : (
        <div className="daily-houses-list">
          {dailyRooms.map((room) => (
            <DailyHouseCard
              key={room.id}
              room={room}
              api={api}
              tenantId={tenantId}
              onContinue={({ room: selectedRoom, range }) => {
                booking.patchDraft({
                  roomId: selectedRoom.id,
                  roomName: selectedRoom.name,
                  checkInDate: range.checkIn,
                  checkOutDate: range.checkOut,
                  guestCount: 0,
                });
                booking.clearStep3Products();
                goTo("bookingStepThree");
              }}
            />
          ))}
        </div>
      )}

      
    </div>
  );
};
