import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/widgets/booking/test/setup.ts"],
    include: ["src/widgets/booking/**/*.{test,spec}.{ts,tsx}"],
    css: true,
  },
});
