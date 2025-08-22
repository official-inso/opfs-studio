import React, { useState } from "react";
import { FilePlus, FolderPlus, Pencil } from "lucide-react";
import { useUI } from "../store";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const CreateFileDialog: React.FC = () => {
  const createFile = useUI((s) => s.createFile);
  const [open, setOpen] = useState<boolean>(false);
  const [path, setPath] = useState<string>("new-file.txt");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          title="Создать файл"
          className="h-6 w-6"
        >
          <FilePlus className="!h-3 !w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Создать файл</DialogTitle>
          <DialogDescription>
            Укажи путь относительно корня OPFS (например,{" "}
            <code>notes/todo.md</code>).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="file-path">Путь</Label>
          <Input
            id="file-path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="folder/name.txt"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Отмена</Button>
          </DialogClose>
          <Button
            onClick={() => {
              void createFile(path).then(() => setOpen(false));
            }}
            disabled={path.trim().length === 0}
          >
            Создать
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          title="Создать папку"
          className="h-6 w-6"
        >
          <FolderPlus className="!h-3 !w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Создать папку</DialogTitle>
          <DialogDescription>
            Можно вложенный путь: <code>a/b/c</code> — будет создана вся
            цепочка.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="dir-path">Путь</Label>
          <Input
            id="dir-path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="folder/sub"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Отмена</Button>
          </DialogClose>
          <Button
            onClick={() => {
              void createDir(path).then(() => setOpen(false));
            }}
            disabled={path.trim().length === 0}
          >
            Создать
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="icon" title="Переименовать">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Переименовать</DialogTitle>
          <DialogDescription>
            Можно менять имя и путь (перемещение).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="from">От</Label>
          <Input id="from" value={from} readOnly />
          <Label htmlFor="to">К</Label>
          <Input id="to" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Отмена</Button>
          </DialogClose>
          <Button
            onClick={() => {
              void rename(from, to).then(() => {
                setOpen(false);
                onDone?.();
              });
            }}
            disabled={to.trim().length === 0 || to === from}
          >
            Переименовать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
