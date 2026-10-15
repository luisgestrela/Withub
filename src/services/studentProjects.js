import { studentProjects } from "../data/projects.js";
import { listMyProjects, me } from "./api.js";

// Linhas de "Meus Projetos": os criados pelo próprio estudante (+ exemplos apenas na conta demo).
export function projectRows() {
  const demo = me().id === "u-eduardo";
  const known = new Set(studentProjects.map((p) => p.id));
  const mine = listMyProjects().filter((p) => !demo || !known.has(p.id)).map((p) => ({
    id: p.id, title: p.title, category: p.category, to: `/publicacao/${p.id}`,
    status: p.visibility === "private" ? "draft" : "approved",
    label: { public: "Publicado no feed", internal: "Visível à instituição", private: "Rascunho privado" }[p.visibility],
    updated: new Date(p.createdAt).toLocaleDateString("pt-BR"),
  }));
  const seeds = demo ? studentProjects.map((p) => ({
    id: p.id, title: p.title, category: p.category, status: p.status, label: p.statusLabel, updated: p.updated,
    to: p.status === "draft" ? "/aluno/novo-projeto" : `/projeto/${p.id}`,
  })) : [];
  return [...mine, ...seeds];
}
