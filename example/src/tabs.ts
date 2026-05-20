const STORAGE_KEY = "opfs-example:active-tab";

function safeGet(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeSet(value: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore
  }
}

export function initTabs(defaultTab: string): void {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>(".tab"),
  );
  const panes = Array.from(
    document.querySelectorAll<HTMLElement>(".tab-pane"),
  );
  if (buttons.length === 0 || panes.length === 0) return;

  const ids = new Set(buttons.map((b) => b.dataset.tab ?? ""));
  const stored = safeGet();
  const initial = stored && ids.has(stored) ? stored : defaultTab;

  function show(target: string): void {
    for (const btn of buttons) {
      btn.classList.toggle("active", btn.dataset.tab === target);
    }
    for (const pane of panes) {
      const id = pane.id.replace(/^tab-/, "");
      pane.classList.toggle("active", id === target);
      pane.hidden = id !== target;
    }
    safeSet(target);
  }

  for (const btn of buttons) {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      if (target) show(target);
    });
  }

  show(initial);
}
