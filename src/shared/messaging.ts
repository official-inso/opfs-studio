export type FilePath = string;
export type FileText = string;

export interface OpfsFileMeta {
  path: FilePath;
  size: number;
  lastModified: number;
  isDirectory: boolean;
  /** Optional FNV-1a hash of file content; only set for small files (<= HASH_FILE_LIMIT). */
  hash?: number;
}
export interface OpfsSnapshot {
  files: OpfsFileMeta[];
  timestamp: number;
}
export type WatchEventType = "added" | "removed" | "modified";
export interface WatchEvent {
  type: WatchEventType;
  meta: OpfsFileMeta;
}

export interface MsgFromContent {
  kind:
    | "ready"
    | "watch-status"
    | "snapshot"
    | "watch-events"
    | "file-read"
    | "bytes-read"
    | "write-result"
    | "create-result"
    | "rename-result"
    | "error"
    | "open-panel"
    | "remove-result"
    | "file-read-start";
  data:
    | null
    | { watching: boolean }
    | OpfsSnapshot
    | WatchEvent[]
    | { path: FilePath; content: FileText }
    | { path: FilePath; bytes: ArrayBuffer }
    | { path: FilePath; ok: true; size: number; lastModified: number }
    | { ok: true; path: FilePath }
    | { ok: true; from: FilePath; to: FilePath }
    | { message: string }
    | { ok: true; path: FilePath; bytes: string };
}

export type ReadRequest = { path: FilePath };
export type RemoveRequest = { path: FilePath, recursive: boolean };
export type WriteRequest = {
  path: FilePath;
  content: FileText;
  createIfMissing: boolean;
};
export type WriteBytesRequest = {
  path: FilePath;
  dataB64: string;
  createIfMissing: boolean;
  expectedSize: number;
};

export type CreateFileRequest = { path: FilePath; content?: FileText };
export type CreateDirRequest = { path: FilePath };
export type RenameRequest = { from: FilePath; to: FilePath };

export interface MsgToContent {
  kind:
    | "start-watch"
    | "stop-watch"
    | "list"
    | "read-file"
    | "read-bytes"
    | "write-file"
    | "write-bytes"
    | "create-file"
    | "create-dir"
    | "rename-path"
    | "tab-unloaded"
    | "remove-path";
  data:
    | null
    | ReadRequest
    | WriteRequest
    | WriteBytesRequest
    | CreateFileRequest
    | CreateDirRequest
    | RenameRequest
    | RemoveRequest;
}
