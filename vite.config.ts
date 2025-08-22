import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        { src: "src/manifest.json", dest: "." },
        { src: "public", dest: "." },
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2022",
    outDir: "dist",
    rollupOptions: {
      input: {
        panel: "src/panel/index.html",
        "content-script": "src/content/content-entry.ts",
        "service-worker": "src/background/service-entry.ts",
        devtools: "src/devtools/devtools.html",
        "devtools-panel": "src/devtools/panel.html",
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "service-worker")
            return "background/service-worker.js";
          if (chunk.name === "content-script")
            return "assets/content-script.js";
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
