import * as React from "react";
import { useTranslation } from "react-i18next";
import { FolderTree, Eye, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export interface WelcomeDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

export const WELCOME_LS_KEY = "opfs_welcome_shown_v2";

export const WelcomeDialog: React.FC<WelcomeDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation();
  const [autoWatch, setAutoWatch] = React.useState<boolean>(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img
              src="/logo.svg"
              alt=""
              className="h-6 w-6 select-none"
              draggable={false}
            />
            {t("welcome.title")}
          </DialogTitle>
          <DialogDescription>{t("welcome.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid gap-3">
          <FeatureRow
            icon={<FolderTree className="h-4 w-4 text-blue-500" />}
            text={t("welcome.points.browse")}
          />
          <FeatureRow
            icon={<Pencil className="h-4 w-4 text-emerald-600" />}
            text={t("welcome.points.editor")}
          />
          <FeatureRow
            icon={<Eye className="h-4 w-4 text-purple-600" />}
            text={t("welcome.points.watcher")}
          />
          <FeatureRow
            icon={<FolderTree className="h-4 w-4 text-orange-500" />}
            text={t("welcome.points.manage")}
          />
        </div>

        {/* <div className="mt-4 flex items-center justify-between rounded-md border p-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {t("welcome.autostartWatch")}
            </span>
          </div>
          <Switch
            checked={autoWatch}
            onCheckedChange={(v) => setAutoWatch(Boolean(v))}
          />
        </div> */}

        <div className="mt-4 flex justify-end">
          <Button
            onClick={async () => {
              try {
                window.localStorage.setItem(WELCOME_LS_KEY, "1");
              } catch {
              }
              onOpenChange(false);
            }}
          >
            {t("welcome.getStarted")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const FeatureRow: React.FC<{ icon: React.ReactNode; text: string }> = ({
  icon,
  text,
}) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5">{icon}</div>
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>
);
