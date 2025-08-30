const METRIKA_ID = "103954503";

/**
 * Отправить хит (аналог pageview).
 * @param path путь/страница (например "panel" или "devtools")
 */
export function trackPage(path: string): void {
  const url = buildUrl(path);
  sendPixel(url);
}

/**
 * Отправить событие.
 * @param name имя события (например "file_saved")
 * @param params дополнительные параметры (ключ-значение)
 */
export function trackEvent(
  name: string,
  params?: Record<string, string>
): void {
  const query = new URLSearchParams({
    ...params,
    event: name,
  });
  const url = buildUrl(`event/${name}?${query.toString()}`);
  sendPixel(url);
}

/**
 * Собрать URL для Метрики
 */
function buildUrl(path: string): string {
  const rn = Math.floor(Math.random() * 1e6);
  return `https://mc.yandex.ru/watch/${METRIKA_ID}/?browser-info=${encodeURIComponent(
    `pv:1:rn:${rn}:ar:1:`
  )}&page-url=${encodeURIComponent(`chrome-extension://${chrome.runtime.id}/${path}`)}`;
}

/**
 * Послать хит через Image пиксель
 */
function sendPixel(url: string): void {
  try {
    const img = new Image();
    img.src = url;
  } catch (e) {
    console.warn("Yandex Metrika send failed", e);
  }
}
