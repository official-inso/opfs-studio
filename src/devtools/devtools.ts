// Path is resolved relative to the extension root; the actual file is emitted
// by Vite as a processed HTML entry (see rollupOptions.input in vite.config.ts).
chrome.devtools.panels.create(
  "OPFS Studio",
  "public/icon128.png",
  "src/devtools/panel.html",
);
