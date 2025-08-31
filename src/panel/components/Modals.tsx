import React, { useState } from "react";
import { FilePlus, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { useUI } from "../store";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { trackEvent } from "@/analytics";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const CreateFileDialog: React.FC = () => {
  const createFile = useUI((s) => s.createFile);
  const [open, setOpen] = useState<boolean>(false);
  const [path, setPath] = useState<string>("new-file.txt");
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* <Tooltip>
          <TooltipTrigger asChild>
            
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("topbar.createFile")}</p>
          </TooltipContent>
        </Tooltip> */}
        <Button variant="secondary" size="icon" className="h-6 w-6">
          <FilePlus className="!h-3 !w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("modals.Createafile")}</DialogTitle>
          <DialogDescription>
            {t("modals.IndicatethepathregardingtherootofOPFSforexample")}{" "}
            <code>notes/todo.md</code>).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="file-path">{t("modals.Path")}</Label>
          <Input
            id="file-path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="folder/name.txt"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t("modals.Cancellationlation")}</Button>
          </DialogClose>
          <Button
            onClick={() => {
              void createFile(path).then(() => setOpen(false));
              trackEvent("created_file", {
                path,
              });
            }}
            disabled={path.trim().length === 0}
          >
            {t("modals.Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const CreateDirDialog: React.FC = () => {
  const createDir = useUI((s) => s.createDir);
  const [open, setOpen] = useState<boolean>(false);
  const [path, setPath] = useState<string>("new-folder");
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* <Tooltip>
          <TooltipTrigger asChild>
            
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("topbar.createFolder")}</p>
          </TooltipContent>
        </Tooltip> */}
        <Button variant="secondary" size="icon" className="h-6 w-6">
          <FolderPlus className="!h-3 !w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("modals.Createafolder")}</DialogTitle>
          <DialogDescription>
            {t("modals.Youcanbeinvested")}: <code>a/b/c</code> —{" "}
            {t("modals.thewholechainwillbecreated")}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="dir-path">{t("modals.Path")}</Label>
          <Input
            id="dir-path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="folder/sub"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t("modals.Cancellation")}</Button>
          </DialogClose>
          <Button
            onClick={() => {
              void createDir(path).then(() => setOpen(false));
              trackEvent("created_folder", {
                path,
              });
            }}
            disabled={path.trim().length === 0}
          >
            {t("modals.Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const RenameDialog: React.FC<{ from: string; onDone?: () => void }> = ({
  from,
  onDone,
}) => {
  const rename = useUI((s) => s.renamePath);
  const [open, setOpen] = useState<boolean>(false);
  const [to, setTo] = useState<string>(from);
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="icon" title="Переименовать">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}>
        <DialogHeader>
          <DialogTitle>{t("modals.Rename")}</DialogTitle>
          <DialogDescription>
            {t("modals.Youcanchangethenameandpathmovement")}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="from">{t("modals.From")}</Label>
          <Input id="from" value={from} readOnly />
          <Label htmlFor="to">{t("modals.TO")}</Label>
          <Input id="to" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t("modals.Cancellation")}</Button>
          </DialogClose>
          <Button
            onClick={(e) => {
              e.preventDefault();
              void rename(from, to).then(() => {
                setOpen(false);
                onDone?.();
              });

              trackEvent("renamed", {
                from,
                to,
              });
            }}
            disabled={to.trim().length === 0 || to === from}
          >
            {t("modals.Rename")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const DeleteDialog: React.FC<{
  path: string;
  isDirectory?: boolean;
  onDone?: () => void;
}> = ({ path, isDirectory = false, onDone }) => {
  const remove = useUI((s) => s.removePath);
  const [open, setOpen] = useState<boolean>(false);
  const [recursive, setRecursive] = useState<boolean>(isDirectory);
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="icon"
          title={t("modals.Delete", "Delete")}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </DialogTrigger>

      <DialogContent onClick={(e) => {
        e.stopPropagation()
        e.preventDefault();
      }}>
        <DialogHeader>
          <DialogTitle>
            {isDirectory
              ? t("modals.DeleteFolderTitle", "Delete folder")
              : t("modals.DeleteFileTitle", "Delete file")}
          </DialogTitle>
          <DialogDescription>
            {isDirectory
              ? t(
                  "modals.DeleteFolderDesc",
                  "This action will delete the folder. You can remove it recursively with all contents."
                )
              : t("modals.DeleteFileDesc", "This action will delete the file.")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="delete-path">{t("modals.Path", "Path")}</Label>
          <Input id="delete-path" value={path} readOnly />

          {isDirectory && (
            <label className="flex items-center gap-2 mt-2">
              <Checkbox
                checked={recursive}
                onCheckedChange={(v) => setRecursive(Boolean(v))}
                id="recursive"
              />
              <span className="text-sm">
                {t("modals.DeleteRecursively", "Delete recursively")}
              </span>
            </label>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">
              {t("modals.Cancellation", "Cancel")}
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              void remove(path, isDirectory ? recursive : false).then(() => {
                setOpen(false);
                onDone?.();
              });
              toast.success(`${t("panel.deleted")}: ${path}`);
              trackEvent("deleted", {
                path,
                recursive: String(isDirectory ? recursive : false),
              });
            }}
          >
            {t("modals.Delete", "Delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};