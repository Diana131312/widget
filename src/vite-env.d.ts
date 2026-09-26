/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WIDGET?: "booking" | "stepper";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
