import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { mentorNavFor } from "../components/navs";
import CategoryChip from "../components/CategoryChip";
import Notice from "../components/Notice";
import { categories } from "../data/projects";
import { useApi } from "../services/useApi";
import { listFeed, offerMentorship, recommendProjects } from "../services/api";

const TABS = [{ key: "recommended", label: "Recomendados" }, { key: "seeking", label: "Procuram mentoria" }, { key: "all", label: "Todos os projetos" }];

export default function MentorExplore() {
  const { user } = useApi();
  const [tab, setTab] = useState("recommended");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [notice, setNotice] = useState(null);
  const recs = recommendProjects();
  const reasonsOf = new Map(recs.map((r) => [r.post.id, r.reasons]));
  const posts = listFeed().filter((e) => e.type === "post" && e.post.visibility === "public" && e.post.ownerId !== user.id).map((e) => e.post);
  const base = tab === "recommended" ? recs.map((r) => r.post) : tab === "seeking" ? posts.filter((p) => p.seekingMentor) : posts;
  const needle = q.trim().toLowerCase();
  const list = base.filter((p) => (cat === "all" || p.category === cat) && (!needle || [p.title, p.description, p.authorName, ...p.tech, ...p.skills].join(" ").toLowerCase().includes(needle)));
  const offer = (id) => {
    try { offerMentorship(id); setNotice({ type: "ok", text: "Oferta enviada. O estudante precisa autorizar a mentoria." }); } catch (e) { setNotice({ type: "err", text: e.message }); }
  };
  return (
    <AppShell nav={mentorNavFor(user.id)} user={user} subtitle="Mentor">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink">Explorar projetos</h1>
        <p className="mt-1 text-sm text-muted">Descubra projetos do mesmo feed da plataforma. Oferecer mentoria só vale depois que o estudante autorizar.</p>
      </div>
      <Notice notice={notice} />
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Seção">
        {TABS.map((t) => <button key={t.key} onClick={() => setTab(t.key)} aria-pressed={tab === t.key} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${tab === t.key ? "border-transparent bg-ink text-white" : "border-line-soft bg-white text-muted hover:border-line"}`}>{t.label}</button>)}
      </div>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px]">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título, tecnologia ou autor…" aria-label="Buscar projetos" className="rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-blue focus:outline-none" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Área STEAM" className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
          <option value="all">Todas as áreas STEAM</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      {list.length === 0 ? (
        <p className="rounded-xl border border-line-soft bg-white p-8 text-center text-sm text-muted">{tab === "recommended" ? "Nenhuma recomendação para o seu perfil. Complete suas especialidades e áreas STEAM no perfil." : "Nenhum projeto encontrado."}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <article key={p.id} className="flex flex-col overflow-hidden rounded-xl border border-line-soft bg-white shadow-card">
              {p.images[0] ? <img src={p.images[0]} alt={`Capa de ${p.title}`} className="h-32 w-full object-cover" /> : <div className={`h-32 bg-gradient-to-br ${p.cover}`} />}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2"><CategoryChip id={p.category} />{p.seekingMentor && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet">Procura mentoria</span>}</div>
                <Link to={`/mentor/projetos/${p.id}`} className="text-[15px] font-semibold leading-snug text-ink hover:text-blue">{p.title}</Link>
                <p className="text-xs text-muted">por {p.authorName}</p>
                {tab === "recommended" && <p className="text-xs text-muted">{(reasonsOf.get(p.id) || []).join(" · ")}</p>}
                <div className="mt-auto flex gap-2 pt-3">
                  <Link to={`/mentor/projetos/${p.id}`} className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-blue hover:text-blue">Ver projeto</Link>
                  <button onClick={() => offer(p.id)} className="rounded-md bg-brand-gradient px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110">Oferecer mentoria</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}