import { safeSessionStorage } from "./browser-storage";
export function isChunkLoadFailure(error:unknown) {
  const message=error instanceof Error ? `${error.name}: ${error.message}` : typeof error==="string" ? error : "";
  return /ChunkLoadError|Loading (?:CSS )?chunk .+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message);
}
export function recoverStaleApp(error:unknown) {
  if (typeof window==="undefined" || !isChunkLoadFailure(error) || navigator.onLine===false) return false;
  const key="zenith:chunk-recovery",now=Date.now();
  const previous=Number(safeSessionStorage.getItem(key)??0);
  if (now-previous<60000 || !safeSessionStorage.setItem(key,String(now))) return false;
  window.location.reload();return true;
}
