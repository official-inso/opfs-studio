import { log } from "../../logger";
import { root } from "./directory";

const TREE = ["a", "b", "c"] as const;
const LEAF = "d.txt";

export async function createTree(): Promise<string> {
  const r = await root();
  let cur: FileSystemDirectoryHandle = r;
  for (const seg of TREE) {
    cur = await cur.getDirectoryHandle(seg, { create: true });
  }
  const file = await cur.getFileHandle(LEAF, { create: true });
  const w = await file.createWritable();
  await w.write("nested leaf payload");
  await w.close();
  return `${TREE.join("/")}/${LEAF}`;
}

export async function walkTree(): Promise<number> {
  const r = await root();
  let count = 0;
  async function walk(dir: FileSystemDirectoryHandle, prefix: string) {
    for await (const [name, handle] of dir.entries()) {
      const path = `${prefix}${name}`;
      if (handle.kind === "file") {
        const f = await (handle as FileSystemFileHandle).getFile();
        log("info", `  file ${path} (${f.size}B)`);
        count++;
      } else {
        log("info", `  dir  ${path}/`);
        await walk(handle as FileSystemDirectoryHandle, `${path}/`);
      }
    }
  }
  await walk(r, "");
  return count;
}

export async function removeTree(): Promise<string> {
  const r = await root();
  await r.removeEntry(TREE[0], { recursive: true });
  return TREE[0];
}
