import React from "react";
import ReactDOM from "react-dom/client";
import { ensureFreshBuild } from "./widgets/booking/freshBuild";
import "./theme-figma.css";
import "./styles.css";

const rootEl = document.getElementById("root")!;

/**
 * VITE_WIDGET=booking | stepper
 * - build (production) → booking (см. .env.production)
 * - pnpm dev / dev:booking → booking
 * - pnpm dev:stepper → stepper
 *
 * Динамический import: в production-сборке ветка stepper вырезается.
 */
const widget = import.meta.env.VITE_WIDGET ?? "booking";

void (async () => {
  await ensureFreshBuild();
  const { App } =
    widget === "stepper"
      ? await import("./App.stepper")
      : await import("./App.booking");

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
})();
