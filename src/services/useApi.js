import { useEffect, useSyncExternalStore } from "react";
import { subscribe, getVersion, me, initializeAuth, isAuthReady } from "./api";

export function useApi() {
  useSyncExternalStore(subscribe, getVersion);
  useEffect(() => { initializeAuth(); }, []);
  return { user: me(), ready: isAuthReady() };
}
