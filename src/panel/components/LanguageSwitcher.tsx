import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { US, RU, DE, FR, ES, CN, JP } from "country-flag-icons/react/3x2";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { trackEvent } from "@/analytics";

export function Flag({ lng }: { lng: string }) {
  return (
    <div className="overflow-hidden rounded-[2px] h-[10px]! w-[16px]!">
      {lng === "ru" ? (
        <RU height={10} width={16} className="h-[10px]! w-[16px]!" />
      ) : lng === "en" ? (
        <US height={10} width={16} className="h-[10px]! w-[16px]!" />
      ) : lng === "fr" ? (
        <FR height={10} width={16} className="h-[10px]! w-[16px]!" />
      ) : lng === "de" ? (
        <DE height={10} width={16} className="h-[10px]! w-[16px]!" />
      ) : lng === "es" ? (
        <ES height={10} width={16} className="h-[10px]! w-[16px]!" />
      ) : lng === "zh" || lng === "zh-CN" ? (
        <CN height={10} width={16} className="h-[10px]! w-[16px]!" />
      ) : lng === "ja" ? (
        <JP height={10} width={16} className="h-[10px]! w-[16px]!" />
      ) : null}
    </div>
  );
}

function normalizeLng(raw: string): string {
  if (!raw) return "en";
  if (raw.startsWith("ru")) return "ru";
  if (raw.startsWith("fr")) return "fr";
  if (raw.startsWith("de")) return "de";
  if (raw.startsWith("es")) return "es";
  if (raw.startsWith("zh")) return "zh-CN";
  if (raw.startsWith("ja")) return "ja";
  return "en";
}

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [lng, setLng] = useState<string>(() => normalizeLng(i18n.language));

  useEffect(() => {
    const handler = (next: string) => setLng(normalizeLng(next));
    i18n.on("languageChanged", handler);
    return () => {
      i18n.off("languageChanged", handler);
    };
  }, [i18n]);

  const onChange = (next: string) => {
    setLng(next);
    void i18n.changeLanguage(next);
    trackEvent("language_switch", { lang: next });
  };

  return (
    <Select value={lng} onValueChange={onChange}>
      <SelectTrigger className="!h-6 p-0 px-2 hover:bg-secondary/80 bg-transparent dark:bg-transparent rounded-md border-none">
        <Flag lng={lng} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="en">
            <Flag lng="en" /> English
          </SelectItem>
          <SelectItem value="ru">
            <Flag lng="ru" /> Русский
          </SelectItem>
          <SelectItem value="fr">
            <Flag lng="fr" /> Français
          </SelectItem>
          <SelectItem value="de">
            <Flag lng="de" /> Deutsch
          </SelectItem>
          <SelectItem value="es">
            <Flag lng="es" /> Español
          </SelectItem>
          <SelectItem value="zh-CN">
            <Flag lng="zh-CN" /> 中文
          </SelectItem>
          <SelectItem value="ja">
            <Flag lng="ja" /> 日本語
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
