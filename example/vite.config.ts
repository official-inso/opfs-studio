import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages serves the demo under a subpath; CI sets DEMO_BASE
  // (e.g. "/opfs-studio/demo/"). Locally it stays at the root "/".
  base: process.env.DEMO_BASE ?? "/",
  server: {
    port: 5174,
    strictPort: true,
  },
  // Don't inherit the repo-root postcss.config.js (Tailwind) — the demo has no
  // Tailwind deps, and in CI the root node_modules isn't installed.
  css: {
    postcss: { plugins: [] },
  },
  build: {
    target: "es2022",
  },
  worker: {
    format: "es",
  },
});
