import { useState } from "react";
import { AppShell } from "../components/AppShell";
import { mentorNav } from "../components/navs";
import ProjectCard from "../components/ProjectCard";
import { projects } from "../data/projects";
import { useApi } from "../services/useApi";

const filters = [{ id: "all", label: "Todos" }, { id: "approved", label: "Validados" }, { id: "review", label: "Em revisão" }];

export default function MentorExplore() {
  const { user } = useApi();
  const [f, setF] = useState("all");
  const list = projects.filter((p) => f === "all" || p.status === f);
  return (
    <AppShell nav={mentorNav} user={user} subtitle="Painel do Mentor">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink">Explorar Instituição</h1>
        <p className="mt-1 text-sm text-muted">Todos os projetos da sua instituição, por situação de validação.</p>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((x) => <button key={x.id} onClick={() => setF(x.id)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${f === x.id ? "border-transparent bg-ink text-white" : "border-line-soft text-muted hover:border-line"}`}>{x.label}</button>)}
      </div>
      {list.length === 0 ? <p className="rounded-xl border border-line-soft bg-white p-8 text-center text-sm text-muted">Nenhum projeto nesta situação.</p>
        : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{list.map((p) => <ProjectCard key={p.id} project={p} />)}</div>}
    </AppShell>
  );
}
