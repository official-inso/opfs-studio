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

  const { t } = useTranslation();

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const revokeRef = useRef<string | null>(null);

  const [forceText, setForceText] = useState<boolean>(false);
  const [forceValue, setForceValue] = useState<string>("");

  useEffect(() => {
    setForceText(false);
    setForceValue("");
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

  if (textual || forceText) {
    const valueForEditor = forceText ? forceValue : buf;
    const onChangeEditor = (next: string) => {
      if (forceText) setForceValue(next);
      setBuf(next);
    };

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
            value={valueForEditor}
            onChange={onChangeEditor}
            formatOnOpen={formatOnOpen}
          />
        </div>
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
    <div className="h-full flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      <div>{t("editor.Thistypeisnotyetsupportedforapreexamination")}</div>
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
    </div>
  );
};
