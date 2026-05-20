import i18n, { Resource } from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// небольшой ассистент под chrome.storage
const LANG_KEY = "lang";

async function loadLocale(lng: string): Promise<Record<string, unknown>> {
  const url = chrome.runtime.getURL(`locales/${lng}/messages.json`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

async function getStoredLang(): Promise<string | null> {
  try {
    const data = await chrome.storage?.sync?.get?.(LANG_KEY);
    return data?.[LANG_KEY] ?? null;
  } catch {
    return null;
  }
}

async function setStoredLang(lng: string): Promise<void> {
  try {
    await chrome.storage?.sync?.set?.({ [LANG_KEY]: lng });
  } catch {}
}

// Поддержка русских множественных форм
const ruPluralRules = new Intl.PluralRules("ru");
function ruPlural(key: string, count?: number) {
  if (typeof count !== "number") return key;
  const cat = ruPluralRules.select(count); // one/few/many/other
  switch (cat) {
    case "one":
      return `${key}_1`;
    case "few":
      return `${key}_2`;
    case "many":
      return `${key}_5`;
    default:
      return `${key}_5`;
  }
}

export async function setupI18n(): Promise<typeof i18n> {
  const stored = await getStoredLang();
  const detected = stored ?? navigator.language ?? "en";

  // определяем язык
  let initial: string = "en"; // по умолчанию английский
  if (detected.startsWith("ru")) initial = "ru";
  else if (detected.startsWith("fr")) initial = "fr";
  else if (detected.startsWith("de")) initial = "de";
  else if (detected.startsWith("es")) initial = "es";
  else if (detected.startsWith("zh")) initial = "zh-CN";
  else if (detected.startsWith("ja")) initial = "ja";

  // Загружаем ресурсы первого языка
  const initialRes = await loadLocale(initial);

  await i18n
    .use(initReactI18next)
    .use(LanguageDetector)
    .init({
      resources: {
        [initial]: { common: initialRes as Resource },
      },
      lng: initial,
      fallbackLng: "en",
      defaultNS: "common",
      ns: ["common"],
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ["querystring", "navigator"],
        caches: [], // мы сами кешируем в chrome.storage
      },
      returnObjects: false,
    });

  // Патч pluralization для ru
  if (initial === "ru") {
    i18n.services.formatter?.add("ruPlural", (val, lng, opts) => {
      const k = String(opts?.key ?? "");
      return i18n.t(ruPlural(k, Number(val)), { count: Number(val) }) as string;
    });
  }

  // Динамическая подгрузка языков
  async function ensureLng(lng: string) {
    if (!i18n.hasResourceBundle(lng, "common")) {
      const res = await loadLocale(lng);
      i18n.addResourceBundle(lng, "common", res, true, true);
    }
  }

  // Переопределяем changeLanguage: динамическая подгрузка бандла + нормализация языка
  const origChange = i18n.changeLanguage.bind(i18n);
  const wrapped: typeof i18n.changeLanguage = async (lng?: string) => {
    let next: string = "en";
    if (!lng) {
      next = "en";
    } else if (lng.startsWith("ru")) {
      next = "ru";
    } else if (lng.startsWith("fr")) {
      next = "fr";
    } else if (lng.startsWith("de")) {
      next = "de";
    } else if (lng.startsWith("es")) {
      next = "es";
    } else if (lng.startsWith("zh")) {
      next = "zh-CN";
    } else if (lng.startsWith("ja")) {
      next = "ja";
    }
    await ensureLng(next);
    await setStoredLang(next);
    return origChange(next);
  };
  i18n.changeLanguage = wrapped;

  // Keep every surface (popup, side panel, devtools) in sync: when the language
  // is changed anywhere it is persisted to chrome.storage.sync, so each open
  // document applies the new language live without needing a reload.
  const norm = (raw?: string | null): string => {
    if (!raw) return "en";
    if (raw.startsWith("ru")) return "ru";
    if (raw.startsWith("fr")) return "fr";
    if (raw.startsWith("de")) return "de";
    if (raw.startsWith("es")) return "es";
    if (raw.startsWith("zh")) return "zh-CN";
    if (raw.startsWith("ja")) return "ja";
    return "en";
  };
  try {
    chrome.storage?.onChanged?.addListener((changes, area) => {
      if (area !== "sync") return;
      const change = changes[LANG_KEY];
      if (!change) return;
      const next = norm(change.newValue as string | undefined);
      if (next === i18n.language) return;
      // Apply directly (origChange) — do not re-persist, to avoid a write loop.
      void ensureLng(next).then(() => origChange(next));
    });
  } catch {
    // storage events unavailable — surfaces still sync on next open
  }

  return i18n;
}
