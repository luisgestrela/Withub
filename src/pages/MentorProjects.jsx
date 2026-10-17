import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { mentorNavFor } from "../components/navs";
import CategoryChip from "../components/CategoryChip";
import { TABS, fmtDate } from "../components/mentoring/stages";
import { STAGE_STYLE } from "../components/mentoring/stages";
import { categories } from "../data/projects";
import { useApi } from "../services/useApi";
import { listMentorProjects, STAGE_LABEL } from "../services/api";

const filterClass = "rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:border-blue focus:outline-none";

export default function MentorProjects() {
  const { user } = useApi();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "all";
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const all = listMentorProjects();
  const rows = listMentorProjects({ q, status, category, from, to });
  const tabs = [{ key: "all", label: "Todos" }, ...TABS];
  const countOf = (k) => (k === "all" ? all.length : all.filter((r) => r.key === k).length);
  const setStatus = (k) => setParams(k === "all" ? {} : { status: k });

  return (
    <AppShell nav={mentorNavFor(user.id)} user={user} subtitle="Mentor">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink">Meus projetos de mentoria</h1>
        <p className="mt-1 text-sm text-muted">Projetos encaminhados a você ou que você acompanha, organizados por etapa.</p>
      </div>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por etapa">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setStatus(t.key)} aria-pressed={status === t.key} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${status === t.key ? "border-transparent bg-ink text-white" : "border-line-soft bg-white text-muted hover:border-line"}`}>
            {t.label} ({countOf(t.key)})
          </button>
        ))}
      </div>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div><label htmlFor="mp-q" className="block text-xs font-medium text-muted">Buscar por título</label><input id="mp-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} className={`mt-1 w-full ${filterClass}`} /></div>
        <div>
          <label htmlFor="mp-cat" className="block text-xs font-medium text-muted">Área STEAM</label>
          <select id="mp-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={`mt-1 w-full ${filterClass}`}>
            <option value="all">Todas</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div><label htmlFor="mp-from" className="block text-xs font-medium text-muted">Enviado a partir de</label><input id="mp-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`mt-1 w-full ${filterClass}`} /></div>
        <div><label htmlFor="mp-to" className="block text-xs font-medium text-muted">Enviado até</label><input id="mp-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`mt-1 w-full ${filterClass}`} /></div>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-line-soft bg-white p-8 text-center text-sm text-muted">{all.length === 0 ? "Você ainda não tem projetos de mentoria. Explore projetos para oferecer mentoria ou aguarde solicitações." : "Nenhum projeto encontrado para esses filtros."}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map((r) => {
            const body = (
              <>
                {r.image ? <img src={r.image} alt={`Capa de ${r.title}`} className="h-32 w-full object-cover" /> : <div className={`h-32 bg-gradient-to-br ${r.cover}`} />}
                <div className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STAGE_STYLE[r.key]}`}>{r.label}</span>
                    <CategoryChip id={r.category} />
                  </div>
                  <h2 className="text-[15px] font-semibold leading-snug text-ink">{r.title}</h2>
                  <p className="line-clamp-2 text-sm text-muted">{r.summary}</p>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted">
                    <div><dt className="inline font-semibold text-ink">Estudante: </dt><dd className="inline">{r.student}</dd></div>
                    <div><dt className="inline font-semibold text-ink">Enviado em: </dt><dd className="inline">{fmtDate(r.sentAt)}</dd></div>
                    <div><dt className="inline font-semibold text-ink">Mentor(es): </dt><dd className="inline">{r.mentors.join(", ") || "—"}</dd></div>
                    <div><dt className="inline font-semibold text-ink">Atualizado: </dt><dd className="inline">{fmtDate(r.updatedAt)}</dd></div>
                  </dl>
                </div>
              </>
            );
            const cls = "overflow-hidden rounded-xl border border-line-soft bg-white shadow-card";
            return r.accessible
              ? <Link key={r.mentorshipId} to={`/mentor/projetos/${r.id}`} className={`${cls} block transition hover:border-blue`}>{body}</Link>
              : <div key={r.mentorshipId} className={cls} title={STAGE_LABEL[r.key]}>{body}</div>;
          })}
        </div>
      )}
    </AppShell>
  );
}