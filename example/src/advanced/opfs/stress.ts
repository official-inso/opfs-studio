import { log } from "../../logger";
import { root } from "./directory";

const STRESS_DIR = "stress";

export async function createMany(count: number): Promise<number> {
  const r = await root();
  const dir = await r.getDirectoryHandle(STRESS_DIR, { create: true });
  for (let i = 0; i < count; i++) {
    const handle = await dir.getFileHandle(`f-${String(i).padStart(4, "0")}.txt`, {
      create: true,
    });
    const w = await handle.createWritable();
    await w.write(`stress file #${i}`);
    await w.close();
  }
  return count;
}

export async function fillUntilQuota(): Promise<{ filesCreated: number; bytesWritten: number }> {
  const r = await root();
  const dir = await r.getDirectoryHandle(STRESS_DIR, { create: true });
  const CHUNK = 1024 * 1024;
  const payload = new Uint8Array(CHUNK).fill(0x41);
  let filesCreated = 0;
  let bytesWritten = 0;
  try {
    for (let i = 0; i < 4096; i++) {
      const handle = await dir.getFileHandle(`fill-${i}.bin`, { create: true });
      const w = await handle.createWritable();
      await w.write(payload);
      await w.close();
      filesCreated++;
      bytesWritten += CHUNK;
      if (i % 16 === 0) {
        const est = await navigator.storage.estimate();
        log(
          "info",
          `  progress: ${filesCreated} files, ${(bytesWritten / 1024 / 1024).toFixed(1)} MB, usage ${est.usage ?? 0}/${est.quota ?? 0}`,
        );
      }
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      log("warn", `QuotaExceededError at file #${filesCreated}, bytes=${bytesWritten}`);
    } else {
      throw e;
    }
  }
  return { filesCreated, bytesWritten };
}
