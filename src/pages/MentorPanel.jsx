import { Link, useLocation } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { mentorNavFor } from "../components/navs";
import StatCard from "../components/StatCard";
import Notice from "../components/Notice";
import CategoryChip from "../components/CategoryChip";
import StageBadge from "../components/StageBadge";
import { fmtDate, fmtDateTime } from "../components/mentoring/stages";
import { useApi } from "../services/useApi";
import { mentorDashboard, recommendProjects } from "../services/api";

const panel = "rounded-xl border border-line-soft bg-white p-5 shadow-card";

export default function MentorPanel() {
  const { user } = useApi();
  const location = useLocation();
  const d = mentorDashboard();
  const recs = recommendProjects().slice(0, 3);
  const c = d.counts;
  const cards = [
    { label: "Projetos acompanhados", value: c.tracked, to: "/mentor/projetos", accent: "text-ink" },
    { label: "Aguardando avaliação", value: c.awaiting, to: "/mentor/projetos?status=awaiting", accent: "text-review" },
    { label: "Aprovados (não publicados)", value: c.approved, to: "/mentor/projetos?status=approved", accent: "text-approved" },
    { label: "Publicados", value: c.published, to: "/mentor/projetos?status=published", accent: "text-approved" },
    { label: "Precisam de revisão", value: c.adjustments, to: "/mentor/projetos?status=adjustments", accent: "text-violet" },
    { label: "Solicitações pendentes", value: c.pendingRequests, to: "/mentor/projetos?status=awaiting", accent: "text-blue" },
    { label: "Conversas não lidas", value: c.unreadConversations, to: "/mentor/chat", accent: "text-violet" },
  ];
  return (
    <AppShell nav={mentorNavFor(user.id)} user={user} subtitle="Mentor">
      {location.state?.welcome && <Notice notice={{ type: "ok", text: "Cadastro concluído. Bem-vindo ao portal do mentor!" }} />}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink">Olá, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted">Acompanhe os projetos que você orienta e as solicitações que aguardam resposta.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((x) => <Link key={x.label} to={x.to} className="block transition hover:-translate-y-0.5"><StatCard label={x.label} value={String(x.value)} accent={x.accent} /></Link>)}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className={panel} aria-labelledby="pend-title">
          <h2 id="pend-title" className="text-base font-bold text-ink">Solicitações de mentoria</h2>
          {d.pendingRequests.length === 0 ? <p className="mt-3 text-sm text-muted">Nenhuma solicitação pendente.</p> : (
            <ul className="mt-3 divide-y divide-line-soft">
              {d.pendingRequests.map((r) => (
                <li key={r.mentorshipId}>
                  <Link to={`/mentor/projetos/${r.id}`} className="block py-3 hover:text-blue">
                    <span className="block text-sm font-semibold text-ink">{r.title}</span>
                    <span className="text-xs text-muted">{r.student} · enviado em {fmtDate(r.sentAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {d.pendingOffers.length > 0 && (
            <div className="mt-4 border-t border-line-soft pt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Ofertas e convites aguardando o estudante</h3>
              <ul className="mt-2 space-y-1.5">
                {d.pendingOffers.map((o) => <li key={o.id} className="text-sm text-ink">{o.title} <span className="text-xs text-muted">· {o.invited ? "convite" : "oferta"} de {fmtDate(o.at)}</span></li>)}
              </ul>
            </div>
          )}
        </section>

        <section className={panel} aria-labelledby="meet-title">
          <h2 id="meet-title" className="text-base font-bold text-ink">Próximos encontros</h2>
          {d.upcoming.length === 0 ? <p className="mt-3 text-sm text-muted">Nenhum encontro agendado. Agende dentro da página de um projeto acompanhado.</p> : (
            <ul className="mt-3 divide-y divide-line-soft">
              {d.upcoming.map((m) => (
                <li key={m.id}><Link to={`/mentor/projetos/${m.projectId}`} className="block py-3 hover:text-blue"><span className="block text-sm font-semibold text-ink">{fmtDateTime(m.at)}</span><span className="text-xs text-muted">{m.projectTitle}{m.note ? ` · ${m.note}` : ""}</span></Link></li>
              ))}
            </ul>
          )}
        </section>

        <section className={panel} aria-labelledby="act-title">
          <h2 id="act-title" className="text-base font-bold text-ink">Atividade recente</h2>
          {d.recent.length === 0 ? <p className="mt-3 text-sm text-muted">Quando houver solicitações, mensagens ou atualizações, elas aparecem aqui.</p> : (
            <ul className="mt-3 divide-y divide-line-soft">
              {d.recent.map((n) => (
                <li key={n.id}><Link to={n.to} className="block py-2.5 text-sm text-ink hover:text-blue">{n.text}<span className="mt-0.5 block text-xs text-muted">{fmtDateTime(n.at)}{!n.read && " · não lida"}</span></Link></li>
              ))}
            </ul>
          )}
          <Link to="/mentor/notificacoes" className="mt-3 inline-block text-xs font-semibold text-blue hover:underline">Ver todas as notificações</Link>
        </section>

        <section className={panel} aria-labelledby="rec-title">
          <h2 id="rec-title" className="text-base font-bold text-ink">Projetos sugeridos para você</h2>
          {recs.length === 0 ? <p className="mt-3 text-sm text-muted">Nenhum projeto corresponde às suas especialidades e áreas STEAM por enquanto.</p> : (
            <ul className="mt-3 divide-y divide-line-soft">
              {recs.map(({ post, reasons }) => (
                <li key={post.id} className="py-3">
                  <Link to={`/mentor/projetos/${post.id}`} className="text-sm font-semibold text-ink hover:text-blue">{post.title}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5"><CategoryChip id={post.category} /><StageBadge stage={post.stage} visibility={post.visibility} /></div>
                  <p className="mt-1 text-xs text-muted">{reasons.join(" · ")}</p>
                </li>
              ))}
            </ul>
          )}
          <Link to="/mentor/explorar" className="mt-3 inline-block text-xs font-semibold text-blue hover:underline">Explorar projetos</Link>
        </section>
      </div>
    </AppShell>
  );
}

