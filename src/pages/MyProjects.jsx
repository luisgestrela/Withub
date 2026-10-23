import { Link } from "react-router-dom";
import { Plus, ChevronRight } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { studentNav } from "../components/navs";
import StatusBadge from "../components/StatusBadge";
import CategoryChip from "../components/CategoryChip";
import { useApi } from "../services/useApi";
import { projectRows } from "../services/studentProjects";
import CopyLinkButton from "../components/CopyLinkButton";

export default function MyProjects() {
  const { user } = useApi();
  const rows = projectRows();
  return (
    <AppShell nav={studentNav} user={user} subtitle="Estudante">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Meus Projetos</h1>
          <p className="mt-1 text-sm text-muted">{rows.length} projetos entre publicados, em análise e rascunhos.</p>
        </div>
        <Link to="/aluno/novo-projeto" className="inline-flex items-center gap-1.5 rounded-md bg-brand-gradient px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110"><Plus className="h-4 w-4" /> Novo Projeto</Link>
      </div>
      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
          <p className="text-sm font-semibold text-ink">Você ainda não publicou nenhum projeto.</p>
          <Link to="/aluno/novo-projeto" className="mt-3 inline-block text-sm font-semibold text-blue hover:underline">Publicar meu primeiro projeto</Link>
        </div>
      )}
      <div className="divide-y divide-line-soft rounded-xl border border-line-soft bg-white px-5 shadow-card">
        {rows.map((p) => (
          <div key={p.id} className="group flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <Link to={p.to} className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-ink group-hover:text-blue">{p.title}</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2"><span className="text-xs text-muted">{p.updated}</span><span className="text-line">·</span><CategoryChip id={p.category} /></div>
            </Link>
            <div className="flex shrink-0 items-center gap-3">
              <StatusBadge status={p.status} label={p.label} />
              {p.to.startsWith("/publicacao/") && <CopyLinkButton id={p.id} compact />}
              <Link to={p.to} aria-label={`Abrir ${p.title}`}><ChevronRight className="h-4 w-4 text-line" /></Link>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
