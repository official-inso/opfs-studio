import { create } from "zustand";
import type {
  OpfsFileMeta,
  WatchEvent,
  OpfsSnapshot,
  MsgToContent,
} from "../shared/messaging";
import { toast } from "sonner";
import { abToBase64 } from "@/shared/base64";
import {
  detectEol,
  extOf,
  fromLF,
  isTextual,
  toLF,
  type EolStyle,
} from "@/shared/text-utils";
import { injectContentScript } from "./lib/inject-content-script";
import { loadUIState, saveUIState } from "./lib/session-state";
import { ti } from "@/i18n-instance";

export type FileId = string;

export type { EolStyle };

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

export type StatusValue =
  | string
  | { key: string; params?: Record<string, unknown> };

export interface UIState {
  files: OpfsFileMeta[];
  tree: FileTreeNode[];
  currentPath: string | null;

  buffer: string;
  buffers: Record<string, string>;
  lastDisk: Record<string, string>;

  content: string;
  eolByPath: Record<string, EolStyle>;

  loading: boolean;
  setLoading: (l: boolean) => void;

  statusLine: StatusValue;
  tabId: number | null;
  watching: boolean;
  conflict: Conflict | null;
  awaitingConflictFor: string | null;
  formatOnOpen: boolean;

  setContent: (text: string) => void;

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
  setStatus: (s: StatusValue) => void;
  toggleDir: (path: string) => void;

  setConflict: (c: Conflict | null) => void;

  createFile: (path: string, content?: string) => Promise<void>;
  createDir: (path: string) => Promise<void>;
  renamePath: (from: string, to: string) => Promise<void>;

  uploadFiles: (files: FileList) => Promise<void>;
  uploadFolder: (files: FileList) => Promise<void>;

  removePath: (path: string, recursive?: boolean) => Promise<void>;

  savePath: (path: string) => Promise<void>;
  saveAll: () => Promise<void>;

  send: <T = unknown>(msg: MsgToContent) => Promise<T>;

  hydrateFromSession: () => Promise<void>;
  _persistedExpanded: Set<string>;
}

export { isTextual };

function pathParts(path: string): string[] {
  return path.split("/").filter(Boolean);
}

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

export const useUI = create<UIState>((set, get) => ({
  files: [],
  tree: [],
  currentPath: null,

  lastDisk: {},
  eolByPath: {},

  buffer: "",
  buffers: {},

  loading: true,
  setLoading: (l: boolean) => set({ loading: l }),

  content: "",

  statusLine: "Success",
  tabId: null,
  watching: true,
  conflict: null,
  awaitingConflictFor: null,
  formatOnOpen: true,

  _persistedExpanded: new Set<string>(),

  setTab: (id) => set({ tabId: id }),
  setWatching: (w) => set({ watching: w }),
  toggleFormatOnOpen: () => set((s) => ({ formatOnOpen: !s.formatOnOpen })),

  setContent: (text: string) => set({ content: text }),

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

  removePath: async (path, recursive = false) => {
    const send = get().send;
    try {
      await send<{ ok?: boolean; error?: string; path?: string }>({
        kind: "remove-path",
        data: { path, recursive },
      });
      if (get().currentPath === path) {
        set({ currentPath: null, buffer: "" });
      }
      await send({ kind: "list", data: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(ti("error.remove", { message: msg }));
    }
  },

  revertPath: (path) => {
    const last = get().lastDisk[path] ?? "";
    get().setBufferForPath(path, last, false);
  },

  applySnapshot: (snap) => {
    const keep = new Map<string, boolean>();
    const collectCollapsed = (nodes: FileTreeNode[]): void => {
      for (const n of nodes) {
        if (n.isDirectory) {
          keep.set(n.path, n.collapsed);
          collectCollapsed(n.children);
        }
      }
    };
    collectCollapsed(get().tree);
    // persisted expanded — приоритет над текущим collapsed: если папка
    // помечена раскрытой ранее, открываем её и в новом дереве.
    for (const p of get()._persistedExpanded) keep.set(p, false);
    const tree = toTree(snap.files, keep);
    set({
      files: snap.files,
      tree,
      statusLine: {
        key: "status.files",
        params: { count: snap.files.filter((f) => !f.isDirectory).length },
      },
    });
  },

  applyWatchEvents: (events) => {
    if (events.length === 0) return;
    const state = get();
    const cur = state.currentPath;
    const tree = state.tree;
    let mutated = false;
    let anyMatched = false;

    for (const e of events) {
      if (e.type !== "modified") continue;
      const n = findFileNode(tree, e.meta.path);
      if (!n) continue;
      anyMatched = true;
      n.size = e.meta.size;
      n.lastModified = e.meta.lastModified;
      if (!n.dirty && n.status !== "modified-externally") {
        n.status = "modified-externally";
        mutated = true;
      }
    }

    if (mutated) {
      set({ tree: [...tree] });
    }
    void anyMatched;

    if (
      cur &&
      events.some(
        (e) =>
          (e.type === "modified" || e.type === "added") &&
          e.meta.path === cur
      )
    ) {
      const currentBuf = get().buffers[cur] ?? "";
      const diskBuf = get().lastDisk[cur] ?? "";
      const hasLocalChanges = currentBuf !== diskBuf;
      if (hasLocalChanges) {
        set({ awaitingConflictFor: cur });
      }
      void state
        .send({ kind: "read-file", data: { path: cur } })
        .catch(() => void 0);
    }
  },

  openFile: (path) => {
    const known = get().buffers[path];
    // Reset buffer/content so previewers don't render stale data from the
    // previously selected file while read-file is in flight. loading=true
    // keeps EditorPanel on the Spin view (not on "unsupported") until the
    // content-script comes back with bytes.
    set({
      currentPath: path,
      conflict: null,
      statusLine: { key: "status.opening", params: { path } },
      buffer: typeof known === "string" ? known : "",
      content: "",
      loading: true,
    });
    saveUIState({ currentPath: path });

    // Safety net: if the content-script never answers (silent failure), drop
    // the spinner after 5s so the user isn't stuck.
    const stuckTimer = window.setTimeout(() => {
      if (useUI.getState().currentPath === path && useUI.getState().loading) {
        useUI.setState({ loading: false });
        toast.error(ti("error.openTimeout", { path }));
      }
    }, 5000);

    void get()
      .send({ kind: "read-file", data: { path } })
      .catch(() => {
        window.clearTimeout(stuckTimer);
        if (useUI.getState().currentPath === path) {
          useUI.setState({ loading: false });
        }
      })
      .finally(() => {
        // file-read / file-read-start handlers in App.tsx will clear loading
        // once data arrives; we still clear the timer here to avoid double-firing.
        window.clearTimeout(stuckTimer);
      });
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

    const curr = get().buffers[path];
    const nextLastDisk =
      typeof curr === "string" ? toLF(curr) : undefined;

    set({
      tree,
      lastDisk:
        nextLastDisk !== undefined
          ? { ...get().lastDisk, [path]: nextLastDisk }
          : get().lastDisk,
      statusLine: { key: "status.saved", params: { path } },
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

    const nextTree = clone(get().tree);
    const expanded = new Set<string>();
    const collectExpanded = (nodes: FileTreeNode[]): void => {
      for (const n of nodes) {
        if (n.isDirectory) {
          if (!n.collapsed) expanded.add(n.path);
          collectExpanded(n.children);
        }
      }
    };
    collectExpanded(nextTree);
    set({ tree: nextTree, _persistedExpanded: expanded });
    saveUIState({ expandedDirs: Array.from(expanded) });
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
    const id = toast.loading(ti("upload.files", { done: 0, total }));

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
        toast.loading(ti("upload.files", { done, total }), { id });
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
    const id = toast.loading(ti("upload.folder", { done: 0, total }));

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
        toast.loading(ti("upload.folder", { done, total }), { id });
      })
    );

    await Promise.allSettled(tasks);
    toast.dismiss(id);
    await send({ kind: "list", data: null });
  },

  savePath: async (path) => {
    const send = get().send;
    try {
      const bufs = get().buffers;
      const textLF = bufs[path];
      if (typeof textLF !== "string") {
        await send({ kind: "read-file", data: { path } });
        return;
      }
      const eol = get().eolByPath[path] ?? "lf";
      const content = fromLF(textLF, eol);
      await send({
        kind: "write-file",
        data: { path, content, createIfMissing: true },
      });
      get().markSaved(path);
      await send({ kind: "list", data: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(ti("error.save", { message: msg }));
    }
  },

  saveAll: async () => {
    const dirty: string[] = [];
    const walk = (nodes: FileTreeNode[]) => {
      for (const n of nodes)
        n.isDirectory ? walk(n.children) : n.dirty && dirty.push(n.path);
    };
    walk(get().tree);
    const send = get().send;
    const results = await Promise.allSettled(
      dirty.map(async (p) => {
        const txt = get().buffers[p];
        if (typeof txt !== "string") return;
        const eol = get().eolByPath[p] ?? "lf";
        const payload = fromLF(txt, eol);
        await send({
          kind: "write-file",
          data: { path: p, content: payload, createIfMissing: true },
        });
        get().markSaved(p);
      })
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      toast.error(ti("error.saveAll", { count: failed }));
    }
    await send({ kind: "list", data: null });
  },

  hydrateFromSession: async () => {
    const data = await loadUIState();
    const expanded = new Set<string>(data.expandedDirs ?? []);
    set({ _persistedExpanded: expanded });
    if (data.currentPath) {
      set({ currentPath: data.currentPath });
    }
  },

  send: async <T>(msg: MsgToContent): Promise<T> => {
    const tabId = get().tabId;
    if (tabId == null) throw new Error("Tab not found");
    try {
      return await sendRaw<T>(tabId, msg);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      if (!/Receiving end does not exist|message port closed/i.test(m)) throw e;
      const injected = await injectContentScript(tabId);
      if (!injected) throw e;
      await new Promise<void>((r) => setTimeout(r, 150));
      return await sendRaw<T>(tabId, msg);
    }
  },
}));

function sendRaw<T>(tabId: number, msg: MsgToContent): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, msg, (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message ?? "chrome.runtime.lastError"));
      } else {
        resolve(response as T);
      }
    });
  });
}
