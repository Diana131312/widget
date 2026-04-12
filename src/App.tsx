import React, { useMemo } from "react";
import { BookingWidget } from "./BookingWidget";
import { createWidgetApi } from "./api";
import { StepperWidget } from "./widgets";

export const App: React.FC = () => {
  const api = useMemo(() => createWidgetApi({ alias: "les" }), []);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <StepperWidget alias="les" title="Stepper Widget" />
      </div>
      {/* <BookingWidget
        title="Бронирование"
        defaultGuests={2}
        onSubmit={async (data) => {
          // Демонстрация: просто дергаем /get/{alias} и логируем
          const cfg = await api.getConfig();
          // eslint-disable-next-line no-console
          console.log("submit:", data, "config.rooms:", cfg.rooms?.length ?? 0);
        }}
      /> */}
    </div>
  );
};

