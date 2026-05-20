type Level = "ok" | "err" | "info" | "warn";

const MAX_LINES = 200;

let listEl: HTMLOListElement | null = null;

export function bindLog(el: HTMLOListElement): void {
  listEl = el;
}

export function log(level: Level, msg: string): void {
  if (!listEl) {
    console[level === "err" ? "error" : "log"](msg);
    return;
  }
  const li = document.createElement("li");
  li.className = level;
  const timeSpan = document.createElement("span");
  timeSpan.className = "time";
  timeSpan.textContent = new Date().toLocaleTimeString();
  li.appendChild(timeSpan);
  li.appendChild(document.createTextNode(msg));
  listEl.appendChild(li);
  while (listEl.childElementCount > MAX_LINES) {
    listEl.removeChild(listEl.firstElementChild!);
  }
  listEl.scrollTop = listEl.scrollHeight;
}

export function clearLog(): void {
  if (listEl) {
    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
  }
}

export function describeError(e: unknown): string {
  if (e instanceof DOMException) return `${e.name}: ${e.message}`;
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}

export async function run(label: string, fn: () => Promise<unknown>): Promise<unknown> {
  log("info", label);
  try {
    const result = await fn();
    if (result !== undefined) log("ok", `${label} → ${formatResult(result)}`);
    else log("ok", `${label} done`);
    return result;
  } catch (e) {
    log("err", `${label}: ${describeError(e)}`);
    throw e;
  }
}

function formatResult(value: unknown): string {
  if (value instanceof Uint8Array) return `Uint8Array(${value.byteLength})`;
  if (value instanceof ArrayBuffer) return `ArrayBuffer(${value.byteLength})`;
  if (value instanceof Blob) return `Blob(${value.size} bytes, ${value.type || "no-type"})`;
  if (typeof value === "string") {
    return value.length > 120 ? `"${value.slice(0, 120)}…"` : `"${value}"`;
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
