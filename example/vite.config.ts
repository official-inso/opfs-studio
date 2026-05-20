import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages serves the demo under a subpath; CI sets DEMO_BASE
  // (e.g. "/opfs-studio/demo/"). Locally it stays at the root "/".
  base: process.env.DEMO_BASE ?? "/",
  server: {
    port: 5174,
    strictPort: true,
  },
  build: {
    target: "es2022",
  },
  worker: {
    format: "es",
  },
});
