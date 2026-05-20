import { log } from "../../logger";

export async function root(): Promise<FileSystemDirectoryHandle> {
  return await navigator.storage.getDirectory();
}

export async function createDir(name: string): Promise<string> {
  const r = await root();
  await r.getDirectoryHandle(name, { create: true });
  return name;
}

export async function removeRecursive(name: string): Promise<string> {
  const r = await root();
  await r.removeEntry(name, { recursive: true });
  return name;
}

export async function wipeRoot(): Promise<number> {
  const r = await root();
  let removed = 0;
  for await (const name of r.keys()) {
    try {
      await r.removeEntry(name, { recursive: true });
      removed++;
    } catch (e) {
      log("err", `failed to remove "${name}": ${(e as Error).message}`);
    }
  }
  return removed;
}

export async function iterEntries(): Promise<string[]> {
  const r = await root();
  const out: string[] = [];
  for await (const [name, handle] of r.entries()) {
    out.push(`${handle.kind}:${name}`);
  }
  log("info", out.length ? out.join(", ") : "(empty)");
  return out;
}

export async function iterKeys(): Promise<string[]> {
  const r = await root();
  const out: string[] = [];
  for await (const k of r.keys()) out.push(k);
  log("info", out.length ? out.join(", ") : "(empty)");
  return out;
}

export async function iterValues(): Promise<string[]> {
  const r = await root();
  const out: string[] = [];
  for await (const v of r.values()) out.push(`${v.kind}:${v.name}`);
  log("info", out.length ? out.join(", ") : "(empty)");
  return out;
}

export async function listRootShort(): Promise<string> {
  const r = await root();
  const items: string[] = [];
  for await (const [name, h] of r.entries()) {
    items.push(h.kind === "directory" ? `${name}/` : name);
  }
  return items.length ? items.join(", ") : "(empty)";
}

export async function resolveOf(name: string): Promise<string[] | null> {
  const r = await root();
  const child = await r.getFileHandle(name, { create: false }).catch(async () => {
    return await r.getDirectoryHandle(name, { create: false });
  });
  const path = await r.resolve(child as FileSystemHandle);
  return path;
}
