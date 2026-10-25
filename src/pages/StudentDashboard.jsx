import { Link } from "react-router-dom";
import { Plus, ChevronRight, Users2 } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { studentNav } from "../components/navs";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import CategoryChip from "../components/CategoryChip";
import { useApi } from "../services/useApi";
import { myNotifications, myStats } from "../services/api";
import { projectRows } from "../services/studentProjects";

export default function StudentDashboard() {
  const { user } = useApi();
  const s = myStats();
  const rows = projectRows().slice(0, 5);
  const recent = myNotifications().slice(0, 3);
  const shortcuts = studentNav.filter((n) => n.to !== "/aluno");
  return (
    <AppShell nav={studentNav} user={user} subtitle="Estudante">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink">Meu Painel</h1>
        <p className="mt-1 text-sm text-muted">Acompanhe o desempenho dos seus projetos na comunidade.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Projetos" value={String(s.projects)} />
        <StatCard label="Publicados no feed" value={String(s.published)} accent="text-approved" />
        <StatCard label="Curtidas recebidas" value={String(s.likes)} accent="text-blue" />
        <StatCard label="Comentários recebidos" value={String(s.comments)} accent="text-violet" />
      </div>

      <nav aria-label="Acesso rápido" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {shortcuts.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="flex items-center gap-2.5 rounded-xl border border-line-soft bg-white p-3.5 text-sm font-semibold text-ink shadow-card transition hover:border-blue hover:text-blue">
            <Icon className="h-4 w-4 shrink-0 text-blue" /> {label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 rounded-xl border border-line-soft bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink">Meus Projetos Acadêmicos</h2>
            {user.institution && <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted"><Users2 className="h-3.5 w-3.5" /> {user.institution}</p>}
          </div>
          <Link to="/aluno/novo-projeto" className="inline-flex items-center gap-1.5 rounded-md bg-brand-gradient px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110"><Plus className="h-4 w-4" /> Novo Projeto</Link>
        </div>
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-muted">Publique seu primeiro projeto para aparecer no feed da comunidade.</p>
        ) : (
          <div className="divide-y divide-line-soft">
            {rows.map((p) => (
              <Link key={p.id} to={p.to} className="group flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-ink group-hover:text-blue">{p.title}</h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2"><span className="text-xs text-muted">{p.updated}</span><span className="text-line">·</span><CategoryChip id={p.category} /></div>
                </div>
                <div className="flex shrink-0 items-center gap-3"><StatusBadge status={p.status} label={p.label} /><ChevronRight className="h-4 w-4 text-line" /></div>
              </Link>
            ))}
          </div>
        )}
        <Link to="/aluno/projetos" className="mt-3 inline-block text-xs font-semibold text-blue hover:underline">Ver todos os projetos</Link>
      </div>

      <div className="mt-6 rounded-xl border border-line-soft bg-white p-5 shadow-card">
        <h2 className="text-base font-bold text-ink">Atividade recente</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Quando alguém comentar ou repostar seus projetos, você verá aqui.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line-soft">
            {recent.map((n) => (
              <li key={n.id}><Link to={n.to} className="block py-2.5 text-sm text-ink hover:text-blue">{n.text}<span className="mt-0.5 block text-xs text-muted">{new Date(n.at).toLocaleString("pt-BR")}</span></Link></li>
            ))}
          </ul>
        )}
        <Link to="/aluno/notificacoes" className="mt-3 inline-block text-xs font-semibold text-blue hover:underline">Ver todas as notificações</Link>
      </div>
    </AppShell>
  );
}