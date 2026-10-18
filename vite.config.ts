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
      // Separate output dirs so a web build can't overwrite the Android one
      // (Capacitor's webDir is dist/).
      outDir: isAndroid ? 'dist' : 'dist-web',
      // The web distribution is a single HTML file, so the bundled fonts (largest
      // is ~30 KB) must inline as data URIs rather than land as separate assets.
      assetsInlineLimit: 64 * 1024,
    },
    // Relative in both builds: the web version lives in a subfolder of the
    // portfolio site (beagleapps.pl/games/toonblast/), not at a domain root.
    base: './',
  };
});
