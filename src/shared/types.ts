export interface WatchOptions {
  intervalMs: number; // e.g. 500-1000
  recursive: boolean; // глубина обхода
  maxEntries: number; // предохранитель
}
