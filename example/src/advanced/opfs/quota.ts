import { log } from "../../logger";

export async function estimate(): Promise<StorageEstimate> {
  const est = await navigator.storage.estimate();
  return {
    usage: est.usage,
    quota: est.quota,
    usageDetails: (est as StorageEstimate & { usageDetails?: unknown }).usageDetails,
  } as StorageEstimate;
}

export async function persist(): Promise<boolean> {
  const granted = await navigator.storage.persist();
  if (!granted) {
    log(
      "warn",
      "persist() returned false. Browser may need a user-engagement signal or the origin doesn't qualify.",
    );
  }
  return granted;
}

export async function persisted(): Promise<boolean> {
  return await navigator.storage.persisted();
}
