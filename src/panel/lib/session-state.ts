export interface CursorPos {
  line: number;
  column: number;
  scrollTop?: number;
}

export type TableDelimiter = "auto" | "," | ";" | "\t" | "|";
export type TableDateFormat = "raw" | "iso" | "locale";

export interface TableSettings {
  hasHeader: boolean;
  fontSize: number;
  delimiter: TableDelimiter;
  decimals: number | null;
  dateFormat: TableDateFormat;
  showFilters: boolean;
}

export const DEFAULT_TABLE_SETTINGS: TableSettings = {
  hasHeader: true,
  fontSize: 12,
  delimiter: "auto",
  decimals: null,
  dateFormat: "raw",
  showFilters: false,
};

export interface PersistedUIState {
  expandedDirs?: string[];
  currentPath?: string;
  cursorByPath?: Record<string, CursorPos>;
  tableSettings?: TableSettings;
}

const KEY = "opfs-ui-state";

function hasStorage(): boolean {
  return typeof chrome !== "undefined" && !!chrome.storage?.session;
}

export async function loadUIState(): Promise<PersistedUIState> {
  if (!hasStorage()) return {};
  try {
    const got = await chrome.storage.session.get(KEY);
    return (got?.[KEY] as PersistedUIState) ?? {};
  } catch {
    return {};
  }
}

let pendingPatch: Partial<PersistedUIState> = {};
let saveTimer: number | null = null;

async function flushSave(): Promise<void> {
  if (!hasStorage()) {
    pendingPatch = {};
    return;
  }
  const patch = pendingPatch;
  pendingPatch = {};
  try {
    const cur = await loadUIState();
    await chrome.storage.session.set({ [KEY]: { ...cur, ...patch } });
  } catch {
    // ignore
  }
}

export function saveUIState(patch: Partial<PersistedUIState>, debounceMs = 200): void {
  pendingPatch = { ...pendingPatch, ...patch };
  if (saveTimer != null) {
    clearTimeout(saveTimer);
  }
  saveTimer = self.setTimeout(() => {
    saveTimer = null;
    void flushSave();
  }, debounceMs);
}

export async function saveUIStateImmediate(patch: Partial<PersistedUIState>): Promise<void> {
  pendingPatch = { ...pendingPatch, ...patch };
  if (saveTimer != null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  await flushSave();
}
