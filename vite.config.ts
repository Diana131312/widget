import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import {
  prepareBookingIndexHtml,
  stripRuntimeCrossOrigin,
} from "./src/widgets/booking/indexHtml";

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

/** Убирает crossorigin и вставляет проверку сборки до модульного скрипта. */
function bookingIndexHtml(): Plugin {
  return {
    name: "booking-index-html",
    apply: "build",
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        return prepareBookingIndexHtml(html);
      },
    },
    renderChunk(code) {
      const next = stripRuntimeCrossOrigin(code);
      if (next === code) return null;
      return { code: next, map: null };
    },
  };
}

export default defineConfig({
  plugins: [react(), bookingBuildVersion(), bookingIndexHtml()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  build: {
    sourcemap: true,
    // Иначе Vite сам вставляет <link rel="modulepreload" crossorigin>,
    // и iPhone снова может не открыть скрипт со второго раза.
    modulePreload: false,
  },
});

