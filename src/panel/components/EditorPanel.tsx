import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CodeEditor } from "./Editor";
import { useUI, isTextual } from "../store";
import { ConflictBanner } from "./Conflict";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { base64ToUint8, base64ToUint8Local } from "@/shared/base64";
import Spin from "./Spin";
import { FileDown, ImageDown } from "lucide-react";
import { TableView } from "./TableView";
import { MarkdownView } from "./MarkdownView";
import { SvgPreview } from "./SvgPreview";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

function ext(path: string | null): string {
  return (path?.split(".").pop() ?? "").toLowerCase();
}

function contentTypeByExt(e: string): string {
  switch (e) {
    // images
    case "svg":
      return "image/svg+xml";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    // video
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "ogv":
      return "video/ogg";
    case "mov":
      return "video/quicktime";
    // audio
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "ogg":
      return "audio/ogg";
    // docs
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

function decodeBase64ToUtf8(b64: string): string {
  const bytes = (
    base64ToUint8 ? base64ToUint8(b64) : base64ToUint8Local(b64)
  ) as Uint8Array;
  const dec = new TextDecoder("utf-8", { fatal: false });
  return dec.decode(bytes);
}

export const EditorPanel: React.FC = () => {
  const path = useUI((s) => s.currentPath);
  const buf = useUI((s) => s.buffer);
  const lastDisk = useUI((s) => s.lastDisk);
  const setBuf = useUI((s) => s.setBuffer);
  const formatOnOpen = useUI((s) => s.formatOnOpen);
  const revertPath = useUI((s) => s.revertPath);
  const setConflict = useUI((s) => s.setConflict);
  const content = useUI((s) => s.content);
  const loading = useUI((s) => s.loading);
  const send = useUI((s) => s.send);

  const { t } = useTranslation();

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const revokeRef = useRef<string | null>(null);

  const [forceText, setForceText] = useState<boolean>(false);
  const [forceValue, setForceValue] = useState<string>("");
  const [viewMode, setViewMode] = useState<"alt" | "code" | "split">("alt");

  useEffect(() => {
    setForceText(false);
    setForceValue("");
    const e = (path?.split(".").pop() ?? "").toLowerCase();
    setViewMode(e === "svg" ? "split" : "alt");
    if (revokeRef.current) {
      URL.revokeObjectURL(revokeRef.current);
      revokeRef.current = null;
    }
    setBlobUrl(null);
  }, [path]);

  const e = ext(path);
  const textual = isTextual(e);
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(e);
  const isVideo = ["mp4", "webm", "ogv", "mov"].includes(e);
  const isAudio = ["mp3", "wav", "ogg"].includes(e);
  const isPdf = e === "pdf";

  const dirty = Boolean(path && buf !== (lastDisk[path!] ?? ""));

  useEffect(() => {
    if (forceText && !forceValue && content) {
      try {
        const initial = decodeBase64ToUtf8(content);
        setForceValue(initial);
      } catch (e) {
        setForceValue("");
        // eslint-disable-next-line no-console
        console.warn("Failed to decode to UTF-8, opening empty buffer");
      }
    }
  }, [forceText, forceValue, content]);

  useEffect(() => {
    if (textual || forceText) {
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current);
        revokeRef.current = null;
      }
      setBlobUrl(null);
      return;
    }

    if (!path || !content) {
      // если контента нет — убедимся, что блоба тоже нет
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current);
        revokeRef.current = null;
      }
      setBlobUrl(null);
      return;
    }

    try {
      const type = contentTypeByExt(e);
      const bytes = (
        base64ToUint8 ? base64ToUint8(content) : base64ToUint8Local(content)
      ) as Uint8Array;
      const bufAb = bytes.buffer as ArrayBuffer;
      const url = URL.createObjectURL(new Blob([bufAb], { type }));
      // чистим предыдущий blob
      if (revokeRef.current) URL.revokeObjectURL(revokeRef.current);
      revokeRef.current = url;
      setBlobUrl(url);
    } catch (err) {
      console.error("Failed to build blob url from base64:", err);
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current);
        revokeRef.current = null;
      }
      setBlobUrl(null);
    }

    return () => {
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current);
        revokeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, textual, e, content, forceText]);

  const handleDownloadFile = useCallback(async () => {
    if (!path) return;

    // имя файла из пути
    const filename = path.split("/").filter(Boolean).pop() ?? "file";

    const textMimeByExt = (x: string): string => {
      switch (x) {
        case "json":
          return "application/json; charset=utf-8";
        case "md":
        case "markdown":
          return "text/markdown; charset=utf-8";
        case "html":
          return "text/html; charset=utf-8";
        case "css":
          return "text/css; charset=utf-8";
        case "js":
        case "jsx":
        case "ts":
        case "tsx":
          return "text/plain; charset=utf-8";
        case "xml":
        case "yml":
        case "yaml":
        case "csv":
        case "txt":
          return "text/plain; charset=utf-8";
        case "svg":
          // SVG можно считать текстом, но для корректного открытия системами лучше так:
          return "image/svg+xml";
        default:
          return "text/plain; charset=utf-8";
      }
    };

    try {
      let blob: Blob;

      if (textual || forceText) {
        // Скачиваем как текст (то, что сейчас в редакторе)
        const text = (forceText ? forceValue : buf) ?? "";
        const mime = textMimeByExt(e);
        blob = new Blob([text], { type: mime });
      } else {
        // Бинарные форматы: сначала пробуем base64 из стора
        if (content) {
          const bytes = (
            base64ToUint8 ? base64ToUint8(content) : base64ToUint8Local(content)
          ) as Uint8Array;
          blob = new Blob([bytes.buffer as ArrayBuffer], {
            type: contentTypeByExt(e),
          });
        } else if (blobUrl) {
          // Если уже есть blobUrl предпросмотра — можно забрать Blob напрямую
          const resp = await fetch(blobUrl);
          blob = await resp.blob();
        } else {
          // Фолбэк: попросим байты у content-script
          const resp = await send<{
            ok?: boolean;
            bytes?: ArrayBuffer;
            error?: string;
          }>({
            kind: "read-bytes",
            data: { path },
          });
          if (!resp?.ok || !resp.bytes) {
            throw new Error(resp?.error ?? "Failed to read bytes");
          }
          blob = new Blob([resp.bytes], { type: contentTypeByExt(e) });
        }
      }

      // Скачивание через временную ссылку
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Быстрый revoke — после клика
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to download file:", err);
    }
  }, [path, e, textual, forceText, forceValue, buf, content, blobUrl, send]);

  if (!path)
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        — {t("editor.Selectthefile")} —
      </div>
    );

  if (textual || forceText) {
    const valueForEditor = forceText ? forceValue : buf;
    const onChangeEditor = (next: string) => {
      if (forceText) setForceValue(next);
      setBuf(next);
    };

    const isTable = !forceText && (e === "csv" || e === "tsv");
    const isMarkdown = !forceText && (e === "md" || e === "markdown");
    const isSvgFile = !forceText && e === "svg";
    const altView = isTable || isMarkdown;
    const altLabel = isTable
      ? t("view.table", "Table")
      : t("view.preview", "Preview");

    return (
      <div className="flex flex-col min-h-0 h-full">
        <div className="h-8 px-2 border-b text-xs flex items-center gap-2">
          <span className="truncate">{path}</span>
          {forceText && (
            <span className="ml-2 px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
              {t("editor.openForced", "Opened in editor (forced)")}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {altView && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={viewMode === "alt" ? "default" : "secondary"}
                  className="h-6 px-2 text-[11px]"
                  onClick={() => setViewMode("alt")}
                >
                  {altLabel}
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "code" ? "default" : "secondary"}
                  className="h-6 px-2 text-[11px]"
                  onClick={() => setViewMode("code")}
                >
                  {t("view.code", "Code")}
                </Button>
              </div>
            )}
            {isSvgFile && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={viewMode === "split" ? "default" : "secondary"}
                  className="h-6 px-2 text-[11px]"
                  onClick={() => setViewMode("split")}
                >
                  {t("view.split", "Split")}
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "code" ? "default" : "secondary"}
                  className="h-6 px-2 text-[11px]"
                  onClick={() => setViewMode("code")}
                >
                  {t("view.code", "Code")}
                </Button>
              </div>
            )}
            <Button
              size="sm"
              variant="secondary"
              className="h-6 px-2 text-[11px] flex items-center gap-2"
              onClick={handleDownloadFile}
            >
              <FileDown size={12} className="h-3 w-3" />
              {t("editor.downloadFile", "Download file")}
            </Button>
            {dirty && (
              <Button
                size="sm"
                variant="secondary"
                className="h-6 px-2 text-[11px]"
                onClick={() => {
                  if (path) {
                    revertPath(path);
                    setConflict(null);
                  }
                }}
                title={t(
                  "editor.Rollupdisruptededitstothelatestversionfromthedisk"
                )}
              >
                {t("editor.Rollowchanges")}
              </Button>
            )}
          </div>
        </div>
        <ConflictBanner />
        <div className="flex-1 min-h-0">
          {altView && viewMode === "alt" ? (
            isTable ? (
              <TableView text={valueForEditor} delimiter={e === "tsv" ? "\t" : ","} />
            ) : (
              <MarkdownView text={valueForEditor} />
            )
          ) : isSvgFile && viewMode === "split" ? (
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={50} minSize={20}>
                <CodeEditor
                  path={path}
                  value={valueForEditor}
                  onChange={onChangeEditor}
                  formatOnOpen={formatOnOpen}
                />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={50} minSize={20}>
                <SvgPreview text={valueForEditor} />
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <CodeEditor
              path={path}
              value={valueForEditor}
              onChange={onChangeEditor}
              formatOnOpen={formatOnOpen}
            />
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-2 items-center justify-center text-sm text-muted-foreground">
        <Spin />
        <span className="ml-2">{t("editor.Loading")}...</span>
      </div>
    );
  }

  if (content && isImage && blobUrl) {
    if (e === "svg") {
      return (
        <div className="h-full flex items-center justify-center bg-black">
          <object
            data={blobUrl}
            type="image/svg+xml"
            className="max-w-full max-h-full"
            aria-label={path ?? "svg"}
          />
        </div>
      );
    }
    return (
      <div className="flex flex-col min-h-0 h-full">
        <div className="h-8 px-2 border-b text-xs flex items-center gap-2">
          <span className="truncate">{path}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-6 px-2 text-[11px] flex items-center gap-2"
              onClick={handleDownloadFile}
            >
              <ImageDown size={12} className="h-3 w-3" />
              {t("editor.downloadImage", "Download image")}
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <div className="h-full flex items-center justify-center bg-black">
            <img
              src={blobUrl}
              alt={path ?? "image"}
              className="max-w-full max-h-full"
            />
          </div>
        </div>
      </div>
    );
  }

  if (content && isVideo && blobUrl)
    return (
      <div className="flex flex-col min-h-0 h-full">
        <div className="h-8 px-2 border-b text-xs flex items-center gap-2">
          <span className="truncate">{path}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-6 px-2 text-[11px] flex items-center gap-2"
              onClick={handleDownloadFile}
            >
              <FileDown size={12} className="h-3 w-3" />
              {t("editor.downloadVideo", "Download video")}
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <div className="h-full flex items-center justify-center bg-black">
            <video
              src={blobUrl}
              controls
              playsInline
              className="max-w-full max-h-full"
            />
          </div>
        </div>
      </div>
    );

  if (content && isAudio && blobUrl)
    return (
      <div className="flex flex-col min-h-0 h-full">
        <div className="h-8 px-2 border-b text-xs flex items-center gap-2">
          <span className="truncate">{path}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-6 px-2 text-[11px] flex items-center gap-2"
              onClick={handleDownloadFile}
            >
              <FileDown size={12} className="h-3 w-3" />
              {t("editor.downloadAudio", "Download audio")}
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <div className="h-full flex items-center justify-center bg-black">
            <audio src={blobUrl} controls className="w-full" />
          </div>
        </div>
      </div>
    );

  if (content && isPdf && blobUrl)
    return (
      <div className="flex flex-col min-h-0 h-full">
        <div className="h-8 px-2 border-b text-xs flex items-center gap-2">
          <span className="truncate">{path}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-6 px-2 text-[11px] flex items-center gap-2"
              onClick={handleDownloadFile}
            >
              <FileDown size={12} className="h-3 w-3" />
              {t("editor.downloadPdf", "Download PDF")}
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <div className="w-full h-full bg-black/90">
            <embed
              src={blobUrl}
              type="application/pdf"
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    );

  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      <div>{t("editor.Thistypeisnotyetsupportedforapreexamination")}</div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="h-7 px-3"
          onClick={() => {
            if (revokeRef.current) {
              URL.revokeObjectURL(revokeRef.current);
              revokeRef.current = null;
            }
            setBlobUrl(null);

            if (content) {
              const initial = decodeBase64ToUtf8(content);
              setForceValue(initial);
            } else {
              setForceValue("");
            }
            setForceText(true);
          }}
        >
          {t("editor.openInEditor", "Open in editor")}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 px-3 flex items-center gap-2"
          onClick={handleDownloadFile}
        >
          <FileDown size={12} className="h-3 w-3" />
          {t("editor.downloadFile", "Download file")}
        </Button>
      </div>
    </div>
  );
};
