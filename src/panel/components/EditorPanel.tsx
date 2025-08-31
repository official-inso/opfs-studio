import React, { useEffect, useRef, useState } from "react";
import { CodeEditor } from "./Editor";
import { useUI, isTextual } from "../store";
import { ConflictBanner } from "./Conflict";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { base64ToUint8, base64ToUint8Local } from "@/shared/base64";
import Spin from "./Spin";

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
      return "video/ogg"; // важно
    case "mov":
      return "video/quicktime"; // важно
    // audio
    case "mp3":
      return "audio/mpeg"; // важно
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

export const EditorPanel: React.FC = () => {
  const path = useUI((s) => s.currentPath);
  const buf = useUI((s) => s.buffer);
  const lastDisk = useUI((s) => s.lastDisk);
  const setBuf = useUI((s) => s.setBuffer);
  const send = useUI((s) => s.send);
  const formatOnOpen = useUI((s) => s.formatOnOpen);
  const revertPath = useUI((s) => s.revertPath);
  const setConflict = useUI((s) => s.setConflict);
  const content = useUI((s) => s.content);

  const loading = useUI((s) => s.loading);

  const { t } = useTranslation();

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const revokeRef = useRef<string | null>(null);

  const e = ext(path);
  const textual = isTextual(e);
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(e);
  const isVideo = ["mp4", "webm", "ogv", "mov"].includes(e);
  const isAudio = ["mp3", "wav", "ogg"].includes(e);
  const isPdf = e === "pdf";

  const dirty = Boolean(path && buf !== (lastDisk[path!] ?? ""));

  // Грузим бинарный файл через content-script и делаем blob URL в панели
  useEffect(() => {
    if (textual) return;

    // сброс предыдущего blob URL
    if (revokeRef.current) {
      URL.revokeObjectURL(revokeRef.current);
      revokeRef.current = null;
    }
    setBlobUrl(null);

    if (!path || !content) return;

    try {
      const type = contentTypeByExt(e);
      // content — это base64 без префикса data:
      const bytes = base64ToUint8
        ? base64ToUint8(content)
        : base64ToUint8Local(content);

      const buf = bytes instanceof Uint8Array ? bytes.buffer : bytes;
      const url = URL.createObjectURL(new Blob([buf as any], { type }));

      revokeRef.current = url;
      setBlobUrl(url);
    } catch (err) {
      console.error("Failed to build blob url from base64:", err);
    }

    // cleanup на размонтировании/смене файла
    return () => {
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current);
        revokeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, textual, e, content]);

  if (!path)
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        — {t("editor.Selectthefile")} —
      </div>
    );

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-2 items-center justify-center text-sm text-muted-foreground">
        <Spin />
        <span className="ml-2">{t("editor.Loading")}...</span>
      </div>
    );
  }

  if (textual) {
    return (
      <div className="flex flex-col min-h-0 h-full">
        <div className="h-8 px-2 border-b text-xs flex items-center gap-2">
          <span className="truncate">{path}</span>
          <div className="ml-auto flex items-center gap-2">
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
          <CodeEditor
            path={path}
            value={buf}
            onChange={setBuf}
            formatOnOpen={formatOnOpen}
          />
        </div>
      </div>
    );
  }

  // Binary previews
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
      <div className="h-full flex items-center justify-center bg-black">
        <img
          src={blobUrl}
          alt={path ?? "image"}
          className="max-w-full max-h-full"
        />
      </div>
    );
  }

  if (content && isVideo && blobUrl)
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <video
          src={blobUrl}
          controls
          playsInline
          className="max-w-full max-h-full"
        />
      </div>
    );

  if (content && isAudio && blobUrl)
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <audio src={blobUrl} controls className="w-full" />
      </div>
    );

  if (content && isPdf && blobUrl)
    return (
      <div className="w-full h-full bg-black/90">
        <embed src={blobUrl} type="application/pdf" className="w-full h-full" />
      </div>
    );

  return (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
      {t("editor.Thistypeisnotyetsupportedforapreexamination")}

      
    </div>
  );
};
