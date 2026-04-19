import React, { useMemo } from "react";
import { BookingWidget } from "./BookingWidget";
import { createWidgetApi } from "./api";
import { StepperWidget } from "./widgets";

export const App: React.FC = () => {
  const api = useMemo(() => createWidgetApi({ alias: "les" }), []);

  return (
    <div className="app-shell">
      <StepperWidget alias="les" title="Stepper Widget" />
      {/* <BookingWidget
        title="Бронирование"
        defaultGuests={2}
        onSubmit={async (data) => {
          const cfg = await api.getConfig();
          console.log("submit:", data, "config.rooms:", cfg.rooms?.length ?? 0);
        }}
      /> */}
    </div>
  );
};
