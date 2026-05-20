import type { i18n as I18nType } from "i18next";

let inst: I18nType | null = null;

export function setI18n(i: I18nType): void {
  inst = i;
}

export function ti(key: string, opts?: Record<string, unknown>): string {
  if (!inst) return key;
  return inst.t(key, opts) as string;
}
