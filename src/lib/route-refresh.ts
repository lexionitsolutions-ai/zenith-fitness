export function createRefreshGate(interval=5000) {
  let lastPath="",lastTime=-Infinity;
  return (path:string,refresh:()=>void,now=Date.now())=>{
    if (path===lastPath && now-lastTime<interval) return false;
    lastPath=path;lastTime=now;refresh();return true;
  };
}
const refreshGate=createRefreshGate();
/** Coalesce focus, visibility and streak events from the same app resume. */
export function refreshCurrentRoute(refresh:()=>void) {
  if (typeof document==="undefined" || document.visibilityState!=="visible") return false;
  if (document.activeElement?.matches("input,textarea,select,[contenteditable=true]")) return false;
  return refreshGate(window.location.pathname,refresh);
}
