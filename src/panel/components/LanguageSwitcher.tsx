import React from "react";
import { useTranslation } from "react-i18next";
import { US, RU } from "country-flag-icons/react/3x2";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Flag({ lng }: { lng: string }) {
  return (
    <div className="overflow-hidden rounded-[2px] h-[10px]! w-[16px]!">
      {lng === "ru" ? (
        <RU height={10} width={16} className="h-[10px]! w-[16px]!" />
      ) : (
        <US height={10} width={16} className="h-[10px]! w-[16px]!" />
      )}
    </div>
  );
}

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const onChange = async (lng: string) => {
    await i18n.changeLanguage(lng);
  };

  return (
    // <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
    //   {t("language")}
    //   <select
    //     value={i18n.language.startsWith("ru") ? "ru" : "en"}
    //     onChange={onChange}
    //   >
    //     <option value="en">English</option>
    //     <option value="ru">Русский</option>
    //   </select>
    // </label>

    <Select
      onValueChange={onChange}
      defaultValue={i18n.language.startsWith("ru") ? "ru" : "en"}
    >
      <SelectTrigger className="!h-6 p-0 px-2 hover:bg-secondary/80 bg-transparent rounded-md border-none">
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
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
