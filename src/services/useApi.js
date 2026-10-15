import { useSyncExternalStore } from "react";
import { subscribe, getVersion, me } from "./api";

export function useApi() {
  useSyncExternalStore(subscribe, getVersion);
  return { user: me() };
}
