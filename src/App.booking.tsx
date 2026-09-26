import React from "react";
import { BookingWidget } from "./widgets/booking";

/** Production и `pnpm dev` / `pnpm dev:booking` — новый MVP-виджет. */
export const App: React.FC = () => {
  return (
    <div className="app-shell">
      <BookingWidget />
    </div>
  );
};
