import { useEffect, useState } from "react";
import { Activity, AlertCircle, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, FolderKanban, MessageSquare, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { mentorNavFor } from "../components/navs";
import Notice from "../components/Notice";
import CategoryChip from "../components/CategoryChip";
import StageBadge from "../components/StageBadge";
import { fmtDate, fmtDateTime } from "../components/mentoring/stages";
import { useApi } from "../services/useApi";
import { mentorDashboard, recommendProjects } from "../services/api";

const panel = "rounded-xl border border-line-soft bg-white p-5 shadow-card";
const stageColors = { awaiting: "bg-review", mentoring: "bg-blue", adjustments: "bg-violet", approved: "bg-approved", published: "bg-approved", completed: "bg-draft" };
const attentionIcon = { request: AlertCircle, review: Clock3, publish: CheckCircle2 };
const attentionTone = { request: "text-review", review: "text-blue", publish: "text-approved" };

function Empty({ children }) { return <p className="mt-3 rounded-lg bg-cloud px-3 py-4 text-sm text-muted">{children}</p>; }

function SectionTitle({ icon: Icon, title, detail, to, linkLabel = "Ver todos" }) {
  return <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="flex items-start gap-2.5"><span className="mt-0.5 rounded-lg bg-blue-50 p-2 text-blue"><Icon className="h-4 w-4" /></span><div><h2 className="text-base font-bold text-ink">{title}</h2>{detail && <p className="mt-0.5 text-xs text-muted">{detail}</p>}</div></div>
    {to && <Link to={to} className="inline-flex items-center gap-1 text-xs font-semibold text-blue hover:underline">{linkLabel}<ArrowUpRight className="h-3.5 w-3.5" /></Link>}
  </div>;
}

function MiniBarChart({ items }) {
  const max = Math.max(...items.map((item) => item.count), 1);
  if (!items.length) return <Empty>Nenhum projeto acompanhado ainda.</Empty>;
  return <div className="mt-5 space-y-3">{items.map((item) => <div key={item.key}>
    <div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate text-muted">{item.label}</span><strong className="font-mono-num text-ink">{item.count}</strong></div>
    <div className="h-2 overflow-hidden rounded-full bg-cloud"><div className={`h-full rounded-full ${stageColors[item.key] || "bg-blue"}`} style={{ width: `${Math.max((item.count / max) * 100, 5)}%` }} /></div>
  </div>)}</div>;
}

export default function MentorPanel() {
  const { user } = useApi();
  const location = useLocation();
  const [d, setDashboard] = useState({ counts: { tracked: 0, active: 0, awaiting: 0, approved: 0, published: 0, adjustments: 0, pendingRequests: 0, upcomingMeetings: 0, unreadConversations: 0 }, pendingRequests: [], pendingOffers: [], upcoming: [], projects: [], attention: [], stageBreakdown: [], recent: [] });
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.all([mentorDashboard(), recommendProjects()]).then(([dashboard, rows]) => { if (active) { setDashboard(dashboard); setRecs(rows.slice(0, 3)); } }).catch(() => { if (active) setRecs([]); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.id]);

  const c = d.counts;
  const actionCount = d.attention.length;
  const cards = [
    { label: "Projetos acompanhados", value: c.tracked, to: "/mentor/projetos", accent: "text-ink", icon: FolderKanban },
    { label: "Mentorias ativas", value: c.active, to: "/mentor/projetos?status=mentoring", accent: "text-blue", icon: Activity },
    { label: "Aguardando sua avaliação", value: c.awaiting, to: "/mentor/projetos?status=awaiting", accent: "text-review", icon: Clock3 },
    { label: "Ações pendentes", value: actionCount, to: "/mentor/projetos", accent: "text-violet", icon: AlertCircle },
    { label: "Aprovados para publicar", value: c.approved, to: "/mentor/projetos?status=approved", accent: "text-approved", icon: CheckCircle2 },
    { label: "Reuniões próximas", value: c.upcomingMeetings, to: "#agenda", accent: "text-blue", icon: CalendarDays },
    { label: "Conversas não lidas", value: c.unreadConversations, to: "/mentor/chat", accent: "text-violet", icon: MessageSquare },
  ];

  return <AppShell nav={mentorNavFor(user.id)} user={user} subtitle="Mentor">
    {location.state?.welcome && <Notice notice={{ type: "ok", text: "Cadastro concluído. Bem-vindo ao portal do mentor!" }} />}
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue">Painel de atuação</p><h1 className="text-2xl font-bold tracking-tight text-ink">Olá, {user.name.split(" ")[0]}</h1><p className="mt-1 text-sm text-muted">Veja o que precisa da sua atenção e acompanhe a evolução dos seus projetos.</p></div><Link to="/mentor/indicadores" className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-card hover:border-blue hover:text-blue"><Activity className="h-4 w-4" /> Ver indicadores</Link></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(({ icon: Icon, ...card }) => { const CardLink = card.to.startsWith("#") ? "a" : Link; const linkProps = card.to.startsWith("#") ? { href: card.to } : { to: card.to }; return <CardLink key={card.label} {...linkProps} className="group block"><div className="rounded-xl border border-line-soft bg-white p-4 shadow-card transition group-hover:-translate-y-0.5 group-hover:border-blue"><div className="flex items-start justify-between gap-2"><p className="text-xs font-medium leading-4 text-muted">{card.label}</p><Icon className={`h-4 w-4 shrink-0 ${card.accent}`} /></div><p className={`mt-2 font-mono-num text-2xl font-bold ${card.accent}`}>{card.value}</p></div></CardLink>; })}</div>

    <section className={`${panel} mt-6 border-blue/20 bg-[linear-gradient(110deg,#FFFFFF,#F6F8FF)]`} aria-labelledby="attention-title"><SectionTitle icon={AlertCircle} title="Precisa da sua atenção" detail={actionCount ? `${actionCount} item(ns) para manter o acompanhamento em dia` : "Seu acompanhamento está em dia"} to="/mentor/projetos" linkLabel="Abrir projetos" />{loading ? <Empty>Carregando prioridades…</Empty> : d.attention.length === 0 ? <Empty>Nenhuma ação pendente. Aproveite para explorar novos projetos.</Empty> : <div className="mt-4 grid gap-2 md:grid-cols-2">{d.attention.map((item) => { const Icon = attentionIcon[item.type] || AlertCircle; return <Link key={item.id} to={item.to} className="flex items-center gap-3 rounded-lg border border-line-soft bg-white p-3 transition hover:border-blue hover:shadow-card"><Icon className={`h-5 w-5 shrink-0 ${attentionTone[item.type] || "text-blue"}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{item.title}</p><p className="truncate text-xs text-muted">{item.detail} · {fmtDate(item.at)}</p></div><span className="shrink-0 rounded-md bg-ink px-2.5 py-1 text-[11px] font-semibold text-white">{item.action}</span></Link>; })}</div>}</section>

    <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.8fr)]"><section className={panel} aria-labelledby="projects-title"><SectionTitle icon={FolderKanban} title="Projetos acompanhados" detail="Ordenados pela última atualização" to="/mentor/projetos" />{d.projects.length === 0 ? <Empty>Você ainda não tem projetos de mentoria. Explore projetos para oferecer acompanhamento.</Empty> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b border-line-soft text-[11px] uppercase tracking-wide text-muted"><th className="pb-2 pr-3 font-semibold">Projeto</th><th className="pb-2 pr-3 font-semibold">Estudante</th><th className="pb-2 pr-3 font-semibold">Etapa</th><th className="pb-2 pr-3 font-semibold">Atualizado</th><th className="pb-2 text-right font-semibold">Abrir</th></tr></thead><tbody className="divide-y divide-line-soft">{d.projects.map((project) => <tr key={`${project.id}-${project.key}`} className="group"><td className="max-w-[220px] py-3 pr-3"><Link to={`/mentor/projetos/${project.id}`} className="block truncate font-semibold text-ink group-hover:text-blue">{project.title}</Link><span className="text-xs text-muted">{project.mentors.length > 1 ? `${project.mentors.length} mentores` : "Mentoria"}</span></td><td className="max-w-[150px] truncate py-3 pr-3 text-muted">{project.student}</td><td className="py-3 pr-3"><StageBadge stage={project.key} visibility={project.visibility} /></td><td className="whitespace-nowrap py-3 pr-3 text-xs text-muted">{fmtDate(project.updatedAt)}</td><td className="py-3 text-right"><Link to={`/mentor/projetos/${project.id}`} className="text-xs font-semibold text-blue hover:underline">Detalhes</Link></td></tr>)}</tbody></table></div>}</section><section className={panel} aria-labelledby="stages-title"><SectionTitle icon={Activity} title="Distribuição por etapa" detail="Visão do seu portfólio atual" to="/mentor/indicadores" linkLabel="Analisar" /><MiniBarChart items={d.stageBreakdown} /><div className="mt-5 flex items-center gap-2 border-t border-line-soft pt-4 text-xs text-muted"><span className="h-2.5 w-2.5 rounded-full bg-blue" />{c.active} mentorias ativas de {c.tracked} projetos acompanhados</div></section></div>

    <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2"><section id="agenda" className={panel} aria-labelledby="agenda-title"><SectionTitle icon={CalendarDays} title="Próximos encontros" detail="Agenda de mentorias" />{d.upcoming.length === 0 ? <Empty>Nenhum encontro agendado. Você pode agendar uma reunião dentro de um projeto ativo.</Empty> : <ul className="mt-4 divide-y divide-line-soft">{d.upcoming.map((meeting) => <li key={meeting.id}><Link to={`/mentor/projetos/${meeting.projectId}`} className="flex items-center gap-3 py-3 hover:text-blue"><span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-blue-50 text-blue"><span className="text-[10px] font-bold uppercase">{new Date(meeting.at).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span><span className="font-mono-num text-sm font-bold">{new Date(meeting.at).getDate()}</span></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{meeting.projectTitle}</span><span className="block truncate text-xs text-muted">{fmtDateTime(meeting.at)}{meeting.note ? ` · ${meeting.note}` : ""}</span></span><ArrowUpRight className="h-4 w-4 shrink-0 text-muted" /></Link></li>)}</ul>}</section><section className={panel} aria-labelledby="activity-title"><SectionTitle icon={MessageSquare} title="Atividade recente" detail="Últimas notificações da sua atuação" to="/mentor/notificacoes" linkLabel="Ver notificações" />{d.recent.length === 0 ? <Empty>Quando houver solicitações, mensagens ou atualizações, elas aparecerão aqui.</Empty> : <ul className="mt-4 divide-y divide-line-soft">{d.recent.map((item) => <li key={item.id}><Link to={item.to || "/mentor/notificacoes"} className="block py-3 hover:text-blue"><span className="block text-sm text-ink">{item.text}</span><span className="mt-1 block text-xs text-muted">{fmtDateTime(item.at)}{!item.read && <span className="ml-2 rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet">Não lida</span>}</span></Link></li>)}</ul>}</section></div>

    <section className={`${panel} mt-6`} aria-labelledby="recommend-title"><SectionTitle icon={Sparkles} title="Projetos recomendados" detail="Oportunidades alinhadas às suas áreas de interesse" to="/mentor/explorar" linkLabel="Explorar todos" />{recs.length === 0 ? <Empty>Nenhum projeto corresponde às suas especialidades por enquanto.</Empty> : <div className="mt-4 grid gap-3 md:grid-cols-3">{recs.map(({ post, reasons }) => <article key={post.id} className="rounded-lg border border-line-soft p-3 transition hover:border-blue"><div className="flex flex-wrap items-center gap-1.5"><CategoryChip id={post.category} /><StageBadge stage={post.stage} visibility={post.visibility} /></div><Link to={`/mentor/projetos/${post.id}`} className="mt-2 block text-sm font-semibold text-ink hover:text-blue">{post.title}</Link><p className="mt-1 line-clamp-2 text-xs text-muted">{post.authorName}</p>{reasons?.length > 0 && <p className="mt-2 text-xs text-muted">{reasons.join(" · ")}</p>}<Link to={`/mentor/projetos/${post.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue">Ver projeto <ArrowUpRight className="h-3 w-3" /></Link></article>)}</div>}</section>
  </AppShell>;
}
