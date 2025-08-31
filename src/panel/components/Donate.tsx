import React, { useMemo, useState } from "react";
import { donateConfig, type Provider, type Region } from "@/donate/providers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DollarSign, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { trackEvent } from "@/analytics";

function detectRegion(language: string): Region {
  // простая эвристика: ru/uk/be -> ru, иначе global
  const l = language.toLowerCase();
  return l.startsWith("ru") || l.startsWith("uk") || l.startsWith("be")
    ? "ru"
    : "global";
}

function ProviderCard({ p }: { p: Provider }) {
  const onClick = (): void => {
    trackEvent("donate_click", { provider: p.id });
    try {
      window.open(p.url, "_blank", "noopener,noreferrer");
    } catch {
      // запасной вариант, если браузер заблокировал
      location.href = p.url;
    }
  };
  return (
    <button
      onClick={onClick}
      className="w-full text-left border rounded-md p-3 hover:bg-muted transition flex items-center justify-between gap-3"
    >
      <div>
        <div className="font-medium">{p.title}</div>
        {p.subtitle && (
          <div className="text-xs text-muted-foreground">{p.subtitle}</div>
        )}
        {p.qrAsset && (
          <img
            src={p.qrAsset}
            alt={`${p.title} QR`}
            className="mt-2 h-28 w-28 object-contain border rounded bg-background"
          />
        )}
      </div>
      <ExternalLink className="h-4 w-4 opacity-70" />
    </button>
  );
}

export const DonateButton: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState<Region>(() =>
    detectRegion(i18n.language)
  );

  const list = useMemo(() => {
    return donateConfig.providers.filter(
      (p) => p.region === region || p.region === "both"
    );
  }, [region]);

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setOpen(true)}
        className={`
    h-6 px-2 text-[12px] font-semibold relative overflow-hidden
    text-yellow-900
    bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400
    border border-yellow-500
    rounded-md shadow-none
    animate-breath
  `}
      >
        <span className="relative z-10 flex items-center gap-1"><DollarSign className="size-3.5"/>{t("donate.button", "Donate")}</span>
        <span
          className="absolute inset-0 -translate-x-full
               bg-gradient-to-tr from-transparent via-white/40 to-transparent
               animate-shimmer"
        />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("donate.title", "Support the project")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">
                {t("donate.region", "Your region")}
              </Label>
              <RadioGroup
                value={region}
                onValueChange={(v) => setRegion(v as Region)}
                className="grid grid-cols-2 gap-2"
              >
                <div className="flex items-center space-x-2 border rounded-md px-3 py-2">
                  <RadioGroupItem value="global" id="r-global" />
                  <Label htmlFor="r-global">Global</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-md px-3 py-2">
                  <RadioGroupItem value="ru" id="r-ru" />
                  <Label htmlFor="r-ru">{t("donate.russia", "Russia and CIS")}</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid gap-2">
              {list.map((p) => (
                <ProviderCard key={p.id} p={p} />
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              {t(
                "donate.note",
                "All payments are processed on external provider pages. No card data is handled by the extension."
              )}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
