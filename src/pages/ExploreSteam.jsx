import { useState } from "react";
import { AppShell } from "../components/AppShell";
import { studentNav } from "../components/navs";
import ProjectCard from "../components/ProjectCard";
import { categories, projects } from "../data/projects";
import { useApi } from "../services/useApi";

export default function ExploreSteam() {
  const { user } = useApi();
  const [cat, setCat] = useState(null);
  const [q, setQ] = useState("");
  const list = projects.filter((p) => p.visibility === "public"
    && (!cat || p.category === cat)
    && (`${p.title} ${p.stack.join(" ")} ${p.institution}`.toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <AppShell nav={studentNav} user={user} subtitle="Estudante">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink">Explorar STEAM</h1>
        <p className="mt-1 text-sm text-muted">Inspire-se em projetos validados de outras instituições.</p>
      </div>
      <div className="mb-5 space-y-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título, tecnologia ou instituição…" aria-label="Buscar" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-blue focus:outline-none" />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCat(null)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${!cat ? "border-transparent bg-ink text-white" : "border-line-soft text-muted hover:border-line"}`}>Todas</button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCat(cat === c.id ? null : c.id)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${cat === c.id ? "border-transparent text-white" : "border-line-soft text-muted hover:border-line"}`} style={cat === c.id ? { backgroundColor: c.color } : {}}>{c.label}</button>
          ))}
        </div>
      </div>
      {list.length === 0 ? <p className="rounded-xl border border-line-soft bg-white p-8 text-center text-sm text-muted">Nenhum projeto encontrado.</p>
        : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{list.map((p) => <ProjectCard key={p.id} project={p} />)}</div>}
    </AppShell>
  );
}
