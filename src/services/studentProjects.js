import { loadMyProjects } from "./database.js";

export function projectRows() {
  return loadMyProjects();
}
