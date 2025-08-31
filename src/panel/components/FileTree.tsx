import React from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  Image as ImageIcon,
  Music,
  FileArchive,
  File as FileIcon,
  FilePlay,
  FileJson,
  FileCode,
} from "lucide-react";
import {
  useUI,
  type FileTreeNode,
  type FileNode,
  type DirNode,
} from "../store";
import { DeleteDialog, RenameDialog } from "./Modals";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";

function fileIcon(node: FileNode): JSX.Element {
  const e = node.ext;
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(e))
    return <ImageIcon className="h-4 w-4 text-blue-500" />;
  if (["mp3", "wav", "ogg"].includes(e))
    return <Music className="h-4 w-4 text-purple-500" />;
  if (["zip", "gz", "tgz", "rar", "7z"].includes(e))
    return <FileArchive className="h-4 w-4 text-yellow-500" />;
  if (["pdf"].includes(e)) return <FileText className="h-4 w-4 text-red-500" />;
  if (["mp4", "webm", "ogv", "mov", "m4a", "m4b", "m4p", "m4v", "m4r", "m4s"].includes(e))
    return <FilePlay className="h-4 w-4 text-green-500" />;
  if (
    ["ts", "tsx", "js", "jsx", "css", "md", "html", "txt", "yml", "yaml", "sql", "log", "csv"].includes(e)
  )
    return <FileText className="h-4 w-4 text-black/75 dark:text-white" />;
  if (["json"].includes(e)) return <FileJson className="h-4 w-4 text-orange-400" />;
  if (["xml"].includes(e)) return <FileCode className="h-4 w-4 text-pink-400" />;
  return <FileIcon className="h-4 w-4 text-gray-400" />;
}

const DirRow: React.FC<{ depth: number; d: DirNode }> = ({ depth, d }) => {
  const toggleDir = useUI((s) => s.toggleDir);
  return (
    <>
      <div
        className="group flex items-center justify-between px-2 py-1 hover:bg-muted rounded-sm cursor-pointer"
        style={{ paddingLeft: depth * 12 }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-actions]")) return;
          toggleDir(d.path);
        }}
      >
        <div className="flex items-center gap-1">
          {d.collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          <Folder className="h-4 w-4 text-yellow-400" />
          <span className="ml-1">{d.name || "/"}</span>
        </div>
        <div
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          data-actions
        >
          <RenameDialog from={d.path} />
          <DeleteDialog path={d.path} isDirectory={true} />
        </div>
      </div>
      {!d.collapsed &&
        d.children.map((ch) => <Row key={ch.id} depth={depth + 1} node={ch} />)}
    </>
  );
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let i = -1;
  do {
    bytes /= 1024;
    i++;
  } while (bytes >= 1024 && i < units.length - 1);
  return `${bytes.toFixed(1)} ${units[i]}`;
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(timestamp);
}

const FileRow: React.FC<{ depth: number; f: FileNode }> = ({ depth, f }) => {
  const openFile = useUI((s) => s.openFile);
  const currentPath = useUI((s) => s.currentPath);
  const active = currentPath === f.path;
  const info = `${formatFileSize(f.size)} • ${formatDate(f.lastModified)}`;

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-2 py-1 rounded-sm transition",
        active ? "bg-muted" : "hover:bg-muted",
        f.status === "modified-externally" && "flash-modified"
      )}
      style={{ paddingLeft: (depth + 1) * 12 }}
      onClick={(e) => {
        e.preventDefault();
        openFile(f.path);
      }}
    >
      {fileIcon(f)}
      <button
        onClick={(e) => {
          e.preventDefault();
          openFile(f.path);
        }}
        className="text-left flex-1 truncate"
        title={info}
      >
        <div className="text-sm leading-4">{f.name}</div>
        <div className="text-[10px] text-muted-foreground leading-3">
          {f.ext || "file"} • {info}
        </div>
      </button>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <RenameDialog from={f.path} />
        <DeleteDialog path={f.path} isDirectory={false} />
      </div>
    </div>
  );
};

const Row: React.FC<{ depth: number; node: FileTreeNode }> = ({
  depth,
  node,
}) =>
  node.isDirectory ? (
    <DirRow depth={depth} d={node as DirNode} />
  ) : (
    <FileRow depth={depth} f={node as FileNode} />
  );

export const FileTree: React.FC = () => {
  const { t } = useTranslation();
  const tree = useUI((s) => s.tree);
  return (
    <ScrollArea className="h-full">
      <div className="p-1">
        {tree.length === 0 ? (
          <div className="text-xs text-muted-foreground px-2 py-1">
            {t("panel.OPFSempty")}
          </div>
        ) : (
          tree.map((n) => <Row key={n.id} depth={0} node={n} />)
        )}
      </div>
    </ScrollArea>
  );
};
