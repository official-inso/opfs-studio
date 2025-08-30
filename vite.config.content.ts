import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        { src: "src/manifest.json", dest: "." },
        { src: "locales", dest: "." },
        { src: "public", dest: "." },
      ],
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        "content-script": "src/content/content-entry.ts",
      },
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: () => "assets/content-script.js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
