import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { crx, ManifestV3Export } from "@crxjs/vite-plugin";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "node:path";
import { fileURLToPath } from "node:url";

import manifestChrome from "./manifests/manifest.chrome.json";
import manifestEdge from "./manifests/manifest.edge.json";
import manifestFirefox from "./manifests/manifest.firefox.json";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET = (process.env.TARGET ?? "chrome") as "chrome" | "edge" | "firefox";

const manifest =
  TARGET === "firefox"
    ? manifestFirefox
    : TARGET === "edge"
      ? manifestEdge
      : manifestChrome;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    crx({
      manifest: manifest as ManifestV3Export,
      browser: TARGET === "firefox" ? "firefox" : "chrome",
    }),
    viteStaticCopy({
      targets: [{ src: "locales", dest: "." }],
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    target: "es2022",
    outDir: `dist/${TARGET}`,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        "devtools-panel": path.resolve(__dirname, "src/devtools/panel.html"),
      },
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  server: {
    port: 64124,
    strictPort: true,
    hmr: {
      port: 64124,
    },
  },
});
