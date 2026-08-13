import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
// --mode android  → normal multi-file build (for Capacitor/Android)
// (default)       → single HTML file (for web distribution)
export default defineConfig(({ mode }) => {
  const isAndroid = mode === 'android';
  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(isAndroid ? [] : [viteSingleFile()]),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    // Honour PORT so the dev server can coexist with other projects already
    // holding Vite's default 5173.
    server: {
      port: Number(process.env.PORT) || 5173,
    },
    build: {
      // The web distribution is a single HTML file, so the bundled fonts (largest
      // is ~30 KB) must inline as data URIs rather than land as separate assets.
      assetsInlineLimit: 64 * 1024,
    },
    base: isAndroid ? './' : '/',
  };
});
