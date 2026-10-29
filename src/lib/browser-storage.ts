type StorageAccess = Pick<Storage,"getItem"|"setItem"|"removeItem">;
export function safeStorage(access:()=>StorageAccess) {
  return {
    getItem(key:string) { try {return access().getItem(key);} catch {return null;} },
    setItem(key:string,value:string) { try {access().setItem(key,value);return true;} catch {return false;} },
    removeItem(key:string) { try {access().removeItem(key);return true;} catch {return false;} },
  };
}
// Access is deferred so restricted/private WebViews and server rendering are safe.
export const safeSessionStorage=safeStorage(()=>window.sessionStorage);
export const safeLocalStorage=safeStorage(()=>window.localStorage);
