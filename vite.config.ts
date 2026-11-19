import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";

/** Один id на сборку: в index.html и в version.json. По нему клиент видит устаревший кеш. */
function bookingBuildVersion(): Plugin {
  const id = new Date().toISOString();
  return {
    name: "booking-build-version",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        "</head>",
        `    <meta name="bk-build" content="${id}" />\n  </head>`
      );
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: `${JSON.stringify({ id })}\n`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), bookingBuildVersion()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  build: {
    sourcemap: true,
  },
});

