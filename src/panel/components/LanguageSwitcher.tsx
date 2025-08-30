import { useTranslation } from "react-i18next";
import { US, RU, DE, FR, ES, CN, JP } from "country-flag-icons/react/3x2";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
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

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const onChange = async (lng: string) => {
    await i18n.changeLanguage(lng);
    trackEvent("language_switch", {
      language: lng,
    });
  };

  return (
    <Select onValueChange={onChange} defaultValue={i18n.language}>
      <SelectTrigger className="!h-6 p-0 px-2 hover:bg-secondary/80 bg-transparent dark:bg-transparent rounded-md border-none">
        <Flag lng={i18n.language} />
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
