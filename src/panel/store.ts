import { create } from "zustand";
import type {
  OpfsFileMeta,
  WatchEvent,
  OpfsSnapshot,
  MsgToContent,
} from "../shared/messaging";
import { toast } from "sonner";
import { abToBase64 } from "@/shared/base64";

export type FileId = string;

export type EolStyle = "lf" | "crlf";

export interface TreeNodeBase {
  id: FileId;
  name: string;
  path: string;
  isDirectory: boolean;
}
export interface DirNode extends TreeNodeBase {
  isDirectory: true;
  children: FileTreeNode[];
  collapsed: boolean;
}
export interface FileNode extends TreeNodeBase {
  isDirectory: false;
  size: number;
  lastModified: number;
  ext: string;
  dirty: boolean;
  status: "saved" | "modified-externally" | "dirty" | "unsupported";
}

export type FileTreeNode = DirNode | FileNode;

export interface Conflict {
  path: string;
  diskContent: string;
}

export interface UIState {
  files: OpfsFileMeta[];
  tree: FileTreeNode[];
  currentPath: string | null;

  buffer: string;
  buffers: Record<string, string>;
  lastDisk: Record<string, string>;
  eolByPath: Record<string, EolStyle>;

  statusLine: string;
  tabId: number | null;
  watching: boolean;
  conflict: Conflict | null;
  awaitingConflictFor: string | null;
  formatOnOpen: boolean;

  revertPath: (path: string) => void;
  applyDiskContent: (path: string, text: string) => void;

  setTab: (id: number | null) => void;
  setWatching: (w: boolean) => void;
  toggleFormatOnOpen: () => void;

  applySnapshot: (snap: OpfsSnapshot) => void;
  applyWatchEvents: (events: WatchEvent[]) => void;

  openFile: (path: string) => void;
  setBuffer: (text: string) => void;
  setBufferForPath: (path: string, text: string, markDirty: boolean) => void;

  setEolForPath: (path: string, eol: EolStyle) => void;

  markSaved: (path: string) => void;
  setStatus: (s: string) => void;
  toggleDir: (path: string) => void;

  setConflict: (c: Conflict | null) => void;

  createFile: (path: string, content?: string) => Promise<void>;
  createDir: (path: string) => Promise<void>;
  renamePath: (from: string, to: string) => Promise<void>;

  uploadFiles: (files: FileList) => Promise<void>;
  uploadFolder: (files: FileList) => Promise<void>;

  savePath: (path: string) => Promise<void>;
  saveAll: () => Promise<void>;

  openInProgressFor: string | null;
  openWatchdogId: number | null;

  startOpenWatchdog: (path: string, timeoutMs?: number) => void;
  stopOpenWatchdog: () => void;

  send: <T = unknown>(msg: MsgToContent) => Promise<T>;
}

function pathParts(path: string): string[] {
  return path.split("/").filter(Boolean);
}
function extOf(name: string): string {
  return (name.split(".").pop() ?? "").toLowerCase();
}
function detectEol(text: string): EolStyle {
  if (/\r\n/.test(text)) return "crlf";
  return "lf";
}
function toLF(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}
function fromLF(textLF: string, eol: EolStyle): string {
  return eol === "lf" ? textLF : textLF.replace(/\n/g, "\r\n");
}

type FileWithPath = File & { webkitRelativePath?: string | undefined };

function normalizePath(input: string): string {
  const s = input.replace(/\\/g, "/").replace(/^\.\//, "");
  return s.replace(/\/{2,}/g, "/").replace(/^\/+/, "");
}

function pLimit(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    active--;
    queue.shift()?.();
  };
  return async <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const run = () => {
        active++;
        fn()
          .then((v) => {
            resolve(v);
            next();
          })
          .catch((e) => {
            reject(e);
            next();
          });
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
}

function toTree(
  files: OpfsFileMeta[],
  keep?: Map<string, boolean>
): FileTreeNode[] {
  const root: DirNode = {
    id: "/",
    name: "/",
    path: "",
    isDirectory: true,
    children: [],
    collapsed: false,
  };
  const ensureDir = (parent: DirNode, name: string, path: string): DirNode => {
    let node = parent.children.find((c) => c.isDirectory && c.name === name) as
      | DirNode
      | undefined;
    if (!node)
      node = {
        id: path || "/",
        name,
        path,
        isDirectory: true,
        children: [],
        collapsed: keep?.get(path) ?? true,
      };
    if (!parent.children.includes(node)) parent.children.push(node);
    return node;
  };
  for (const f of files) {
    const parts = pathParts(f.path);
    let cur = root;
    for (let i = 0; i < parts.length - 1; i += 1)
      cur = ensureDir(cur, parts[i]!, parts.slice(0, i + 1).join("/"));
    const name = parts.at(-1) ?? "";
    if (f.isDirectory) ensureDir(cur, name, f.path);
    else {
      const node: FileNode = {
        id: f.path,
        name,
        path: f.path,
        isDirectory: false,
        size: f.size,
        lastModified: f.lastModified,
        ext: extOf(name),
        dirty: false,
        status: isTextual(extOf(name)) ? "saved" : "unsupported",
      };
      cur.children.push(node);
    }
  }
  const sortDir = (d: DirNode): void => {
    d.children.sort((a, b) =>
      a.isDirectory === b.isDirectory
        ? a.name.localeCompare(b.name)
        : a.isDirectory
          ? -1
          : 1
    );
    for (const c of d.children) if (c.isDirectory) sortDir(c);
  };
  sortDir(root);
  return root.children;
}

function findDirNode(nodes: FileTreeNode[], path: string): DirNode | null {
  for (const n of nodes) {
    if (n.isDirectory) {
      if (n.path === path) return n;
      const inner = findDirNode(n.children, path);
      if (inner) return inner;
    }
  }
  return null;
}
function findFileNode(nodes: FileTreeNode[], path: string): FileNode | null {
  for (const n of nodes) {
    if (n.isDirectory) {
      const inner = findFileNode(n.children, path);
      if (inner) return inner;
    } else if (n.path === path) return n;
  }
  return null;
}

export function isTextual(ext: string): boolean {
  return [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json",
    "css",
    "md",
    "markdown",
    "html",
    "txt",
    "xml",
    "yml",
    "yaml",
    "svg",
    "csv",
    "sql",
    "log",
  ].includes(ext);
}

export const useUI = create<UIState>((set, get) => ({
  files: [],
  tree: [],
  currentPath: null,

  lastDisk: {},
  eolByPath: {},

  buffer: "",
  buffers: {},

  statusLine: "Success",
  tabId: null,
  watching: true,
  conflict: null,
  awaitingConflictFor: null,
  formatOnOpen: true,
  openInProgressFor: null,
  openWatchdogId: null,

  setTab: (id) => set({ tabId: id }),
  setWatching: (w) => set({ watching: w }),
  toggleFormatOnOpen: () => set((s) => ({ formatOnOpen: !s.formatOnOpen })),

  applyDiskContent: (path, text) => {
    const eol = detectEol(text);
    const textLF = toLF(text);

    const tree = get().tree;
    const node = findFileNode(tree, path);
    if (node) {
      node.dirty = false;
      node.status = "saved";
    }
    const buffers = { ...get().buffers, [path]: textLF };
    const lastDisk = { ...get().lastDisk, [path]: textLF };
    const eolByPath = { ...get().eolByPath, [path]: eol };

    const updates: Partial<UIState> = { buffers, lastDisk, eolByPath, tree };
    if (get().currentPath === path) updates.buffer = textLF;
    set(updates);
  },

  startOpenWatchdog: (path, timeoutMs = 2000) => {
    const prev = get().openWatchdogId;
    if (prev != null) window.clearTimeout(prev);
    const id = window.setTimeout(() => {
    }, timeoutMs);
    set({ openInProgressFor: path, openWatchdogId: id });
  },

  stopOpenWatchdog: () => {
    const id = get().openWatchdogId;
    if (id != null) {
      window.clearTimeout(id);
    }
    set({ openInProgressFor: null, openWatchdogId: null });
  },

  revertPath: (path) => {
    const last = get().lastDisk[path] ?? "";
    get().setBufferForPath(path, last, false);
  },

  applySnapshot: (snap) => {
    const keep = new Map<string, boolean>();
    for (const n of get().tree)
      if (n.isDirectory) keep.set(n.path, n.collapsed);
    const tree = toTree(snap.files, keep);
    set({
      files: snap.files,
      tree,
      statusLine: `Files: ${snap.files.filter((f) => !f.isDirectory).length}`,
    });
  },

  applyWatchEvents: (events) => {
    const state = get();
    const cur = state.currentPath;
    const tree = state.tree;

    for (const e of events) {
      if (e.type !== "modified") continue;
      const n = findFileNode(tree, e.meta.path);
      if (!n) continue;
      if (!n.dirty) n.status = "modified-externally";
      window.setTimeout(() => {
        const nn = findFileNode(get().tree, e.meta.path);
        if (nn && !nn.dirty && nn.status === "modified-externally") {
          nn.status = "saved";
          set({ tree: [...get().tree] });
        }
      }, 100);
    }

    if (
      cur &&
      events.some((e) => e.type === "modified" && e.meta.path === cur)
    ) {
      const node = findFileNode(tree, cur);
      const currentBuf = get().buffers[cur] ?? "";
      const diskBuf = get().lastDisk[cur] ?? "";
      const hasLocalChanges = currentBuf !== diskBuf;

      if (node && hasLocalChanges) {
        set({ awaitingConflictFor: cur });
        void state
          .send({ kind: "read-file", data: { path: cur } })
          .catch(() => void 0);
      } else {
        void state
          .send({ kind: "read-file", data: { path: cur } })
          .catch(() => void 0);
      }
    }

    set({ tree: [...tree] });
  },

  openFile: (path) => {
    const known = get().buffers[path];
    set({
      currentPath: path,
      conflict: null,
      statusLine: `Открывается: ${path}`,
      ...(typeof known === "string" ? { buffer: known } : {}),
    });

    void get()
      .send({ kind: "read-file", data: { path } })
      .catch(() => void 0);
    get().startOpenWatchdog(path);
  },

  setBuffer: (text) => {
    const path = get().currentPath;
    if (!path) {
      set({ buffer: text });
      return;
    }
    const tree = get().tree;
    const node = findFileNode(tree, path);

    const prevDisk = get().lastDisk[path] ?? "";
    const willBeDirty = text !== prevDisk;

    if (node) {
      node.dirty = willBeDirty;
      node.status = willBeDirty ? "dirty" : "saved";
    }
    const buffers = { ...get().buffers, [path]: text };
    set({ buffer: text, buffers, tree });
  },

  setBufferForPath: (path, text, markDirty) => {
    const tree = get().tree;
    const node = findFileNode(tree, path);
    const prevDisk = get().lastDisk[path] ?? "";
    const dirty = markDirty ?? text !== prevDisk;

    if (node) {
      node.dirty = dirty;
      node.status = dirty ? "dirty" : "saved";
    }
    const buffers = { ...get().buffers, [path]: text };
    const updates: Partial<UIState> = { buffers, tree };
    if (get().currentPath === path) updates.buffer = text;
    set(updates);
  },

  setEolForPath: (path, eol) => {
    set((s) => ({ eolByPath: { ...s.eolByPath, [path]: eol } }));
  },

  markSaved: (path) => {
    const tree = get().tree;
    const node = findFileNode(tree, path);

    if (node) {
      node.dirty = false;
      node.status = "saved";
    }

    const bufs = get().buffers;
    const curr = bufs[path];
    const lastDiskPrev = get().lastDisk[path];

    const nextLastDisk =
      typeof curr === "string"
        ? curr.replace(/\r\n?/g, "\n")
        : undefined;

    set({
      tree,
      lastDisk:
        nextLastDisk !== undefined
          ? { ...get().lastDisk, [path]: nextLastDisk }
          : get().lastDisk,
      statusLine: `Saved: ${path}`,
      conflict: null,
    });
  },

  setStatus: (s) => set({ statusLine: s }),

  toggleDir: (path) => {
    const clone = (nodes: FileTreeNode[]): FileTreeNode[] =>
      nodes.map((n) => {
        if (n.isDirectory) {
          const d = n as DirNode;
          const children = clone(d.children);
          if (d.path === path) {
            return { ...d, collapsed: !d.collapsed, children };
          }
          if (children !== d.children) return { ...d, children };
          return d;
        }
        return n;
      });

    set({ tree: clone(get().tree) });
  },

  setConflict: (c) => {
    set({ conflict: c, awaitingConflictFor: null });
  },

  createFile: async (path, content) => {
    await get().send({ kind: "create-file", data: { path, content } });
    await get().send({ kind: "list", data: null });
  },

  createDir: async (path) => {
    await get().send({ kind: "create-dir", data: { path } });
    await get().send({ kind: "list", data: null });
  },

  renamePath: async (from, to) => {
    await get().send({ kind: "rename-path", data: { from, to } });
    await get().send({ kind: "list", data: null });
    if (get().currentPath === from) set({ currentPath: to });
  },

  uploadFiles: async (files) => {
    const lim = pLimit(4);
    const send = get().send;
    const list: File[] = Array.from(files);
    let done = 0;
    const total = list.length;
    const id = toast.loading(`Uploading files… 0/${total}`);

    const tasks = list.map((f) =>
      lim(async () => {
        const ab = await f.arrayBuffer();
        const b64 = abToBase64(ab);
        const path = normalizePath(f.name);
        await send({
          kind: "write-bytes",
          data: {
            path,
            dataB64: b64,
            expectedSize: ab.byteLength,
            createIfMissing: true,
          },
        });
        done++;
        toast.loading(`Uploading files… ${done}/${total}`, { id });
      })
    );

    await Promise.allSettled(tasks);
    toast.dismiss(id);
    await send({ kind: "list", data: null });
  },

  uploadFolder: async (files) => {
    const lim = pLimit(4);
    const send = get().send;
    const list = Array.from(files) as (File & {
      webkitRelativePath?: string;
    })[];
    let done = 0;
    const total = list.length;
    const id = toast.loading(`Uploading the folder… 0/${total}`);

    const tasks = list.map((f) =>
      lim(async () => {
        const rel = normalizePath(f.webkitRelativePath ?? f.name);
        const ab = await f.arrayBuffer();
        const b64 = abToBase64(ab);
        await send({
          kind: "write-bytes",
          data: {
            path: rel,
            dataB64: b64,
            expectedSize: ab.byteLength,
            createIfMissing: true,
          },
        });
        done++;
        toast.loading(`Uploading the folder… ${done}/${total}`, { id });
      })
    );

    await Promise.allSettled(tasks);
    toast.dismiss(id);
    await send({ kind: "list", data: null });
  },

  savePath: async (path) => {
    const bufs = get().buffers;
    const textLF = bufs[path];
    if (typeof textLF !== "string") {
      await get().send({ kind: "read-file", data: { path } });
      return;
    }
    const eol = get().eolByPath[path] ?? "lf";
    const content = eol === "lf" ? textLF : textLF.replace(/\n/g, "\r\n");
    await get().send({
      kind: "write-file",
      data: { path, content, createIfMissing: true },
    });
    get().markSaved(path);
    await get().send({ kind: "list", data: null });
  },

  saveAll: async () => {
    const dirty: string[] = [];
    const walk = (nodes: FileTreeNode[]) => {
      for (const n of nodes)
        n.isDirectory ? walk(n.children) : n.dirty && dirty.push(n.path);
    };
    walk(get().tree);
    const bufs = get().buffers;
    await Promise.all(
      dirty.map(async (p) => {
        const txt = get().buffers[p];
        if (typeof txt !== "string") return; // подстраховка
        const eol = get().eolByPath[p] ?? "lf";
        const payload = eol === "lf" ? txt : txt.replace(/\n/g, "\r\n");
        await get().send({
          kind: "write-file",
          data: { path: p, content: payload, createIfMissing: true },
        });
        get().markSaved(p);
      })
    );
    await get().send({ kind: "list", data: null });
  },

  send: <T>(msg: MsgToContent) =>
    new Promise<T>((resolve, reject) => {
      const tabId = get().tabId;
      if (tabId == null) {
        reject(new Error("Tab not found"));
        return;
      }
      chrome.tabs.sendMessage(tabId, msg, (response) => {
        const err = chrome.runtime.lastError;
        if (err) reject(err);
        else resolve(response as T);
      });
    }),
}));
