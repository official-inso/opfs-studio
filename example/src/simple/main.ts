import { log, run } from "../logger";
import { PRESETS, type PresetResult } from "./presets";

function describe(res: PresetResult): string {
  if (res.tree) {
    const created = res.tree.created.length;
    const skipped = res.tree.skipped.length;
    const skipMsg = skipped ? `, ${skipped} skipped` : "";
    return `created ${created} file${created === 1 ? "" : "s"}${skipMsg}`;
  }
  if (res.path && typeof res.size === "number") {
    return `${res.path} (${res.size}B)`;
  }
  if (res.path) return res.path;
  if (res.message) return res.message;
  return "done";
}

export function bootstrapSimple(): void {
  const grid = document.getElementById("simple-grid");
  if (!grid) return;
  grid.replaceChildren();

  for (const preset of PRESETS) {
    const card = document.createElement("article");
    card.className = `preset-card preset-${preset.kind}`;

    const title = document.createElement("h3");
    title.textContent = preset.label;

    const desc = document.createElement("p");
    desc.textContent = preset.description;

    const btn = document.createElement("button");
    btn.textContent = "Run";
    btn.dataset.presetId = preset.id;
    btn.addEventListener("click", () => {
      btn.disabled = true;
      void run(`simple:${preset.id}`, async () => {
        const result = await preset.run();
        if (result.tree) {
          for (const created of result.tree.created) log("ok", `  + ${created}`);
          for (const skipped of result.tree.skipped) log("warn", `  · ${skipped}`);
        }
        return describe(result);
      })
        .catch(() => void 0)
        .finally(() => {
          btn.disabled = false;
        });
    });

    card.append(title, desc, btn);
    grid.append(card);
  }
}
