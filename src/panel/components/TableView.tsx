import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { useTranslation } from "react-i18next";
import {
  ArrowDownUp,
  ArrowDown,
  ArrowUp,
  Filter,
  Settings2,
  X,
} from "lucide-react";
import {
  DEFAULT_TABLE_SETTINGS,
  loadUIState,
  saveUIState,
  type TableDateFormat,
  type TableDelimiter,
  type TableSettings,
} from "../lib/session-state";

interface TableViewProps {
  text: string;
  /** Hint from the file extension, used when delimiter === "auto". */
  delimiter?: string;
}

type SortDir = "asc" | "desc";
const NUMBER_RE = /^\s*-?\d+(?:[.,]\d+)?\s*$/;

function detectDelimiter(text: string, fallback?: string): string {
  if (!text) return fallback ?? ",";
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const candidates = [",", ";", "\t", "|"];
  let best = candidates[0]!;
  let bestCount = -1;
  for (const c of candidates) {
    const count = firstLine.split(c).length - 1;
    if (count > bestCount) {
      best = c;
      bestCount = count;
    }
  }
  return bestCount > 0 ? best : fallback ?? ",";
}

function asNumber(v: string): number | null {
  if (!NUMBER_RE.test(v)) return null;
  const n = Number(v.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function asDate(v: string): Date | null {
  if (!v || v.length < 4) return null;
  const t = Date.parse(v);
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

function formatCell(
  raw: string,
  settings: Pick<TableSettings, "decimals" | "dateFormat">,
): string {
  if (settings.decimals !== null) {
    const n = asNumber(raw);
    if (n !== null) return n.toFixed(settings.decimals);
  }
  if (settings.dateFormat !== "raw") {
    const d = asDate(raw);
    if (d) {
      if (settings.dateFormat === "iso") return d.toISOString();
      return d.toLocaleString();
    }
  }
  return raw;
}

function compareRows(
  a: string[],
  b: string[],
  col: number,
  dir: SortDir,
): number {
  const va = a[col] ?? "";
  const vb = b[col] ?? "";
  const na = asNumber(va);
  const nb = asNumber(vb);
  let result: number;
  if (na !== null && nb !== null) {
    result = na - nb;
  } else {
    const da = asDate(va);
    const db = asDate(vb);
    if (da && db) result = da.getTime() - db.getTime();
    else result = va.localeCompare(vb, undefined, { numeric: true });
  }
  return dir === "asc" ? result : -result;
}

export const TableView: React.FC<TableViewProps> = ({ text, delimiter }) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<TableSettings>(DEFAULT_TABLE_SETTINGS);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filters, setFilters] = useState<Record<number, string>>({});
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    void loadUIState().then((s) => {
      if (s.tableSettings) setSettings({ ...DEFAULT_TABLE_SETTINGS, ...s.tableSettings });
    });
  }, []);

  const updateSettings = (patch: Partial<TableSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveUIState({ tableSettings: next });
      return next;
    });
  };

  const activeDelimiter = useMemo(() => {
    if (settings.delimiter !== "auto") return settings.delimiter;
    return detectDelimiter(text, delimiter);
  }, [settings.delimiter, delimiter, text]);

  const rows = useMemo(() => {
    const parsed = Papa.parse<string[]>(text, {
      delimiter: activeDelimiter,
      skipEmptyLines: true,
    });
    return parsed.data;
  }, [text, activeDelimiter]);

  const [head, body] = useMemo<[string[] | null, string[][]]>(() => {
    if (rows.length === 0) return [null, []];
    if (settings.hasHeader) return [rows[0]!, rows.slice(1)];
    // Synthesize numeric headers when there is no header row
    const widest = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const synth = Array.from({ length: widest }, (_, i) => String(i + 1));
    return [synth, rows];
  }, [rows, settings.hasHeader]);

  const filteredSorted = useMemo(() => {
    let work = body;
    const activeFilters = Object.entries(filters).filter(([, v]) => v.length > 0);
    if (activeFilters.length > 0) {
      work = work.filter((row) =>
        activeFilters.every(([idxStr, needle]) => {
          const idx = Number(idxStr);
          const cell = row[idx] ?? "";
          return cell.toLowerCase().includes(needle.toLowerCase());
        }),
      );
    }
    if (sortCol !== null) {
      work = [...work].sort((a, b) => compareRows(a, b, sortCol, sortDir));
    }
    return work;
  }, [body, filters, sortCol, sortDir]);

  const onHeaderClick = (i: number) => {
    if (sortCol === i) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortCol(null);
        setSortDir("asc");
      }
    } else {
      setSortCol(i);
      setSortDir("asc");
    }
  };

  const resetAll = () => {
    setSortCol(null);
    setSortDir("asc");
    setFilters({});
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <Toolbar
          settings={settings}
          updateSettings={updateSettings}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          activeDelimiter={activeDelimiter}
          onReset={resetAll}
          hasState={false}
        />
        <div className="p-4 text-sm text-muted-foreground">empty</div>
      </div>
    );
  }

  const cols = head!;

  return (
    <div className="flex flex-col h-full min-h-0">
      <Toolbar
        settings={settings}
        updateSettings={updateSettings}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        activeDelimiter={activeDelimiter}
        onReset={resetAll}
        hasState={sortCol !== null || Object.values(filters).some(Boolean)}
      />

      <div className="flex-1 min-h-0 overflow-auto p-2">
        <table
          className="border-collapse w-full"
          style={{ fontSize: settings.fontSize }}
        >
          <thead className="sticky top-0 z-10 bg-background">
            <tr>
              {cols.map((cell, i) => (
                <th
                  key={i}
                  className="border border-border bg-muted/40 px-2 py-1 text-left font-semibold whitespace-pre cursor-pointer select-none"
                  onClick={() => onHeaderClick(i)}
                >
                  <span className="inline-flex items-center gap-1">
                    <span>{cell}</span>
                    {sortCol === i ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )
                    ) : (
                      <ArrowDownUp className="w-3 h-3 opacity-30" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
            {settings.showFilters && (
              <tr>
                {cols.map((_, i) => (
                  <th
                    key={i}
                    className="border border-border bg-background px-1 py-0.5"
                  >
                    <input
                      value={filters[i] ?? ""}
                      onChange={(ev) =>
                        setFilters((f) => ({ ...f, [i]: ev.target.value }))
                      }
                      placeholder={t("view.filter", "filter")}
                      className="w-full bg-transparent outline-none border-none px-1 py-0.5"
                      style={{ fontSize: Math.max(10, settings.fontSize - 1) }}
                    />
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {filteredSorted.map((row, ri) => (
              <tr key={ri}>
                {cols.map((_, ci) => (
                  <td
                    key={ci}
                    className="border border-border px-2 py-1 align-top whitespace-pre"
                  >
                    {formatCell(row[ci] ?? "", settings)}
                  </td>
                ))}
              </tr>
            ))}
            {filteredSorted.length === 0 && (
              <tr>
                <td
                  className="px-3 py-2 text-muted-foreground"
                  colSpan={cols.length}
                >
                  {t("view.emptyFilter", "No rows match the current filter")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface ToolbarProps {
  settings: TableSettings;
  updateSettings: (patch: Partial<TableSettings>) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  activeDelimiter: string;
  onReset: () => void;
  hasState: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  settings,
  updateSettings,
  showSettings,
  setShowSettings,
  activeDelimiter,
  onReset,
  hasState,
}) => {
  const { t } = useTranslation();
  return (
    <div className="border-b">
      <div className="h-8 px-2 flex items-center gap-2 text-xs">
        <button
          type="button"
          className="inline-flex items-center gap-1 h-6 px-2 rounded border border-border hover:bg-muted/40"
          onClick={() => setShowSettings(!showSettings)}
          title={t("view.tableSettings", "Table settings")}
        >
          <Settings2 className="w-3 h-3" />
          <span>{t("view.tableSettings", "Settings")}</span>
        </button>
        <button
          type="button"
          className={
            "inline-flex items-center gap-1 h-6 px-2 rounded border border-border hover:bg-muted/40 " +
            (settings.showFilters ? "bg-muted/40" : "")
          }
          onClick={() => updateSettings({ showFilters: !settings.showFilters })}
          title={t("view.toggleFilters", "Toggle filters")}
        >
          <Filter className="w-3 h-3" />
          <span>{t("view.filter", "Filter")}</span>
        </button>
        {hasState && (
          <button
            type="button"
            className="inline-flex items-center gap-1 h-6 px-2 rounded border border-border hover:bg-muted/40"
            onClick={onReset}
            title={t("view.resetSort", "Reset sort / filter")}
          >
            <X className="w-3 h-3" />
            <span>{t("view.reset", "Reset")}</span>
          </button>
        )}
      </div>
      {showSettings && (
        <SettingsPanel settings={settings} updateSettings={updateSettings} activeDelimiter={activeDelimiter} />
      )}
    </div>
  );
};

interface SettingsPanelProps {
  settings: TableSettings;
  updateSettings: (patch: Partial<TableSettings>) => void;
  activeDelimiter: string;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  updateSettings,
  activeDelimiter,
}) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-2 border-t bg-muted/20 text-xs">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.hasHeader}
          onChange={(e) => updateSettings({ hasHeader: e.target.checked })}
        />
        <span>{t("view.firstRowHeader", "First row is header")}</span>
      </label>

      <label className="flex items-center gap-2">
        <span className="text-muted-foreground">
          {t("view.fontSize", "Font size")}
        </span>
        <input
          type="number"
          min={9}
          max={20}
          value={settings.fontSize}
          onChange={(e) =>
            updateSettings({
              fontSize: Math.max(9, Math.min(20, Number(e.target.value) || 12)),
            })
          }
          className="w-14 h-6 px-1 border border-border rounded bg-background"
        />
        <span className="text-muted-foreground">px</span>
      </label>

      <label className="flex items-center gap-2 col-span-1">
        <span className="text-muted-foreground">
          {t("view.delimiter", "Delimiter")}
        </span>
        <select
          value={settings.delimiter}
          onChange={(e) =>
            updateSettings({ delimiter: e.target.value as TableDelimiter })
          }
          className="h-6 px-1 border border-border rounded bg-background"
        >
          <option value="auto">auto ({JSON.stringify(activeDelimiter)})</option>
          <option value=",">, (comma)</option>
          <option value=";">; (semicolon)</option>
          <option value="\t">\t (tab)</option>
          <option value="|">| (pipe)</option>
        </select>
      </label>

      <label className="flex items-center gap-2 col-span-1">
        <span className="text-muted-foreground">
          {t("view.decimals", "Decimals")}
        </span>
        <select
          value={settings.decimals === null ? "off" : String(settings.decimals)}
          onChange={(e) => {
            const v = e.target.value;
            updateSettings({ decimals: v === "off" ? null : Number(v) });
          }}
          className="h-6 px-1 border border-border rounded bg-background"
        >
          <option value="off">{t("view.asIs", "as-is")}</option>
          {[0, 1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 col-span-2">
        <span className="text-muted-foreground">
          {t("view.dateFormat", "Date format")}
        </span>
        <select
          value={settings.dateFormat}
          onChange={(e) =>
            updateSettings({ dateFormat: e.target.value as TableDateFormat })
          }
          className="h-6 px-1 border border-border rounded bg-background"
        >
          <option value="raw">{t("view.asIs", "as-is")}</option>
          <option value="iso">ISO 8601</option>
          <option value="locale">{t("view.locale", "Locale")}</option>
        </select>
      </label>
    </div>
  );
};
