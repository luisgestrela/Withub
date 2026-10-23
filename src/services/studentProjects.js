import { studentProjects } from "../data/projects.js";
import { listMyProjects, me, STAGE_LABEL } from "./api.js";

export function projectRows() {
  const demo = me().id === "u-eduardo";
  const known = new Set(studentProjects.map((p) => p.id));
  const mine = listMyProjects().filter((p) => !demo || !known.has(p.id)).map((p) => ({
    id: p.id, title: p.title, category: p.category, to: `/publicacao/${p.id}`,
    status: p.stage ? (["awaiting", "mentoring", "adjustments"].includes(p.stage) ? "review" : "approved") : p.visibility === "private" ? "draft" : "approved",
    label: p.stage ? `${STAGE_LABEL[p.stage === "approved" && p.visibility === "public" ? "published" : p.stage]}` : p.publishRequested && p.visibility !== "public" ? "Aguardando mentor para publicar" : { public: "Publicado no feed", internal: "Visível à instituição", private: "Rascunho privado" }[p.visibility],
    updated: new Date(p.createdAt).toLocaleDateString("pt-BR"),
  }));
  const own = new Set(listMyProjects().map((p) => p.id));
  const seeds = demo ? studentProjects.map((p) => ({
    id: p.id, title: p.title, category: p.category, status: p.status, label: p.statusLabel, updated: p.updated,
    to: own.has(p.id) ? `/publicacao/${p.id}` : p.status === "draft" ? "/aluno/novo-projeto" : `/projeto/${p.id}`,
  })) : [];
  return [...mine, ...seeds];
}

