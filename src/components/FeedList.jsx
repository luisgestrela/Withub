import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Building2, MessageSquare, Repeat2, X } from "lucide-react";
import CategoryChip from "./CategoryChip";
import PostActions from "./PostActions";
import Notice from "./Notice";
import { useApi } from "../services/useApi";
import { categories } from "../data/projects";
import { listFeed, startDirectChat } from "../services/api";

const PERIODS = { all: 0, week: 7, month: 30 };
const popularity = (p) => p.likes + p.comments + p.reposts;

export function Chips({ items, tone = "bg-cloud text-ink" }) {
  if (!items?.length) return null;
  return <div className="flex flex-wrap gap-1.5">{items.map((t) => <span key={t} className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{t}</span>)}</div>;
}

export default function FeedList() {
  const { user } = useApi();
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState("recent");
  const [period, setPeriod] = useState("all");
  const [seeking, setSeeking] = useState(false);
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim();
  const needle = q.toLowerCase();
  const since = PERIODS[period] ? Date.now() - PERIODS[period] * 864e5 : 0;
  const entries = listFeed().filter(({ post: p, at }) => (!needle
    || [p.title, p.description, p.authorName, ...p.skills, ...p.knowledge, ...p.tech].join(" ").toLowerCase().includes(needle))
    && (cat === "all" || p.category === cat) && (!seeking || p.seekingMentor) && at >= since)
    .sort((a, b) => (sort === "popular" ? popularity(b.post) - popularity(a.post) || b.at - a.at : sort === "oldest" ? a.at - b.at : b.at - a.at));
  const chat = (mentorId, projectId) => {
    try { navigate(`/mentor/chat/${startDirectChat(mentorId, projectId)}`); } catch (e) { setNotice({ type: "err", text: e.message }); }
  };
  return (
    <>
      <Notice notice={notice} />
      <div className="mx-auto mb-4 flex max-w-2xl flex-wrap items-center gap-2 rounded-xl border border-line-soft bg-white p-3 text-xs">
        <label htmlFor="feed-cat" className="sr-only">Área STEAM</label>
        <select id="feed-cat" value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-md border border-line bg-white px-2 py-1.5 text-ink">
          <option value="all">Todas as áreas STEAM</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <label htmlFor="feed-sort" className="sr-only">Ordenação</label>
        <select id="feed-sort" value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-md border border-line bg-white px-2 py-1.5 text-ink">
          <option value="recent">Mais recentes</option>
          <option value="popular">Mais populares</option>
          <option value="oldest">Mais antigos</option>
        </select>
        <label htmlFor="feed-period" className="sr-only">Período</label>
        <select id="feed-period" value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-md border border-line bg-white px-2 py-1.5 text-ink">
          <option value="all">Qualquer data</option>
          <option value="week">Últimos 7 dias</option>
          <option value="month">Últimos 30 dias</option>
        </select>
        <label className="flex items-center gap-1.5 font-medium text-ink"><input type="checkbox" checked={seeking} onChange={(e) => setSeeking(e.target.checked)} /> Procuram mentoria</label>
      </div>
      {q && (
        <p className="mx-auto mb-4 flex max-w-2xl items-center justify-between gap-3 rounded-lg border border-line-soft bg-white px-4 py-2.5 text-sm text-ink">
          <span>{entries.length} resultado{entries.length === 1 ? "" : "s"} para “<b>{q}</b>”</span>
          <Link to="/feed" className="inline-flex items-center gap-1 text-xs font-semibold text-blue hover:underline"><X className="h-3.5 w-3.5" /> Limpar busca</Link>
        </p>
      )}
      {entries.length === 0 && <p className="rounded-xl border border-line-soft bg-white p-8 text-center text-sm text-muted">{q || cat !== "all" || seeking || period !== "all" ? "Nenhum projeto encontrado para esses filtros." : "Nenhum projeto no feed ainda."}</p>}
      <div className="mx-auto max-w-2xl space-y-5">
        {entries.map((e) => {
          const p = e.post;
          return (
            <article key={e.key} className="overflow-hidden rounded-xl border border-line-soft bg-white shadow-card">
              {e.type === "repost" && (
                <p className="flex items-center gap-1.5 border-b border-line-soft px-4 py-2 text-xs text-muted"><Repeat2 className="h-3.5 w-3.5" /> {e.by} repostou</p>
              )}
              <div className="flex items-center gap-2.5 px-4 pt-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">{p.authorName.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                <div>
                  <p className="text-sm font-semibold leading-tight text-ink">{p.authorName}</p>
                  <p className="text-xs text-muted">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {p.seekingMentor && <span className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet">Procura mentoria</span>}
                  {p.visibility === "internal" && <span className="inline-flex items-center gap-1 rounded-full bg-draft-bg px-2 py-0.5 text-[11px] font-medium text-draft"><Building2 className="h-3 w-3" /> Só minha instituição</span>}
                  <CategoryChip id={p.category} />
                </div>
              </div>
              <Link to={`/publicacao/${p.id}`}>
                {p.images[0]
                  ? <img src={p.images[0]} alt={`Capa de ${p.title}`} loading="lazy" className="mt-3 aspect-[2/1] w-full object-cover" />
                  : <div className={`mt-3 h-40 bg-gradient-to-br ${p.cover}`} />}
              </Link>
              <div className="space-y-3 p-4">
                <Link to={`/publicacao/${p.id}`} className="block text-base font-bold text-ink hover:text-blue">{p.title}</Link>
                <p className="line-clamp-3 text-sm text-muted">{p.description}</p>
                <Chips items={p.skills} tone="bg-blue-50 text-blue" />
                <Chips items={p.tech} />
                {p.mentors.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
                    <span>Mentoria:</span>
                    {p.mentors.map((m) => (
                      <span key={m.id} className="inline-flex items-center gap-1.5">
                        <Link to={`/mentores/${m.id}`} className="font-semibold text-ink hover:text-blue">{m.name}</Link>
                        {user.role === "mentor" && m.id !== user.id && (
                          <button onClick={() => chat(m.id, p.id)} aria-label={`Conversar com ${m.name}`} className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 font-semibold text-ink hover:border-blue hover:text-blue"><MessageSquare className="h-3 w-3" /> Conversar</button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-3">
                  <PostActions post={p} onError={(t) => setNotice({ type: "err", text: t })} />
                  <Link to={`/publicacao/${p.id}`} className="text-xs font-semibold text-blue hover:underline">Ver projeto completo</Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

