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
  const initial = detected.startsWith("ru") ? "ru" : "en";

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
        // detection плагин, но свой stored язык главнее
        order: ["querystring", "navigator"],
        caches: [], // мы сами кешируем в chrome.storage
      },
      returnObjects: false,
    });

  // Патч pluralization для ru (опционально)
  if (initial === "ru") {
    i18n.services.formatter?.add("ruPlural", (val, lng, opts) => {
      const k = String(opts?.key ?? "");
      return i18n.t(ruPlural(k, Number(val)), { count: Number(val) }) as string;
    });
  }

  // Динамический лоад других языков
  async function ensureLng(lng: string) {
    if (!i18n.hasResourceBundle(lng, "common")) {
      const res = await loadLocale(lng);
      i18n.addResourceBundle(lng, "common", res, true, true);
    }
  }

  // Переопределяем changeLanguage, чтобы подгружать JSON и сохранять выбор
  const origChange = i18n.changeLanguage.bind(i18n);
  i18n.changeLanguage = (async (lng?: string) => {
    const next = (lng ?? "en").startsWith("ru") ? "ru" : "en";
    await ensureLng(next);
    await setStoredLang(next);
    return origChange(next);
  }) as any;

  return i18n;
}
