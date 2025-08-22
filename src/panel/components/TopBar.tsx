import React, { useRef } from "react";
import {
  RefreshCcw,
  Play,
  Square,
  Save,
  Upload,
  UploadCloud,
  Wand2,
  Palette,
} from "lucide-react";
import { useUI } from "../store";
import { CreateFileDialog, CreateDirDialog } from "./Modals";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getTheme, setTheme } from "../theme";

export const TopBar: React.FC = () => {
  const send = useUI((s) => s.send);
  const currentPath = useUI((s) => s.currentPath);
  const buffer = useUI((s) => s.buffer);
  const markSaved = useUI((s) => s.markSaved);
  const watching = useUI((s) => s.watching);
  const saveAll = useUI((s) => s.saveAll);
  const uploadFiles = useUI((s) => s.uploadFiles);
  const uploadFolder = useUI((s) => s.uploadFolder);
  const formatOnOpen = useUI((s) => s.formatOnOpen);
  const toggleFormatOnOpen = useUI((s) => s.toggleFormatOnOpen);
  const setWatching = useUI((s) => s.setWatching);

  const filesInput = useRef<HTMLInputElement | null>(null);
  const folderInput = useRef<HTMLInputElement | null>(null);

  return (
    <div className="border-b bg-background">
      <div className="h-10 px-2 flex items-center gap-1">
        <Button
          variant="secondary"
          size="icon"
          title="Обновить"
          className="h-6 w-6"
          onClick={() => {
            //send({ kind: "list", data: null }).catch(() => void 0)
            window.location.reload();
          }}
        >
          <RefreshCcw className="!h-3 !w-3" />
        </Button>

        <Button
          variant={watching ? "default" : "secondary"}
          className={
            watching
              ? "bg-green-500/20 hover:bg-green-500/50 h-6 w-6 text-green-700"
              : "h-6 w-6"
          }
          size="icon"
          title="Старт наблюдения"
          disabled={watching}
          onClick={() => {
            setWatching(true);
            void send({ kind: "start-watch", data: null });
          }}
        >
          <Play className="!h-3 !w-3" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          title="Стоп наблюдения"
          className={
            watching
              ? "bg-red-500/20 hover:bg-red-500/50 h-6 w-6 text-red-700"
              : "h-6 w-6"
          }
          disabled={!watching}
          onClick={() => {
            setWatching(false);
            void send({ kind: "stop-watch", data: null });
          }}
        >
          <Square className="!h-3 !w-3" />
        </Button>

        <CreateFileDialog />
        <CreateDirDialog />

        <input
          ref={filesInput}
          type="file"
          multiple
          className="hidden h-6 w-6"
          onChange={(e) => {
            if (e.target.files) void uploadFiles(e.target.files);
            e.currentTarget.value = "";
          }}
        />
        <Button
          variant="secondary"
          size="icon"
          title="Загрузить файлы"
          className="h-6 w-6"
          onClick={() => filesInput.current?.click()}
        >
          <Upload className="!h-3 !w-3" />
        </Button>

        <input
          ref={folderInput}
          type="file" //@ts-expect-error webkitdirectory
          webkitdirectory="true"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void uploadFolder(e.target.files);
            e.currentTarget.value = "";
          }}
        />
        <Button
          variant="secondary"
          size="icon"
          title="Загрузить папку"
          className="h-6 w-6"
          onClick={() => folderInput.current?.click()}
        >
          <UploadCloud className="!h-3 !w-3" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          variant="secondary"
          size="icon"
          title="Сменить тему"
          className="h-6 w-6"
          onClick={() => setTheme(getTheme() === "dark" ? "light" : "dark")}
        >
          <Palette className="!h-3 !w-3" />
        </Button>

        {/* <Separator orientation="vertical" className="mx-1 h-6" /> */}

        {/* <Button
          variant={formatOnOpen ? "default" : "secondary"}
          size="icon"
          title={
            formatOnOpen
              ? "Форматировать при открытии: ВКЛ"
              : "Форматировать при открытии: ВЫКЛ"
          }
          onClick={toggleFormatOnOpen}
        >
          <Wand2 className="!h-3 !w-3" />
        </Button> */}

        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="h-6 px-2 text-[12px]"
            onClick={() =>
              void saveAll().then(() =>
                toast.success("Все изменения сохранены")
              )
            }
          >
            Сохранить всё
          </Button>
          <Button
            size="sm"
            disabled={!currentPath}
            className="h-6 px-2 text-[12px]"
            onClick={() => {
              if (!currentPath) return;
              void send({
                kind: "write-file",
                data: {
                  path: currentPath,
                  content: buffer,
                  createIfMissing: true,
                },
              }).then(() => {
                markSaved(currentPath);
                toast.success(`Сохранено: ${currentPath}`);
              });
            }}
          >
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
};
