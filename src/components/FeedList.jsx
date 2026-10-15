import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Building2, Repeat2, X } from "lucide-react";
import CategoryChip from "./CategoryChip";
import PostActions from "./PostActions";
import Notice from "./Notice";
import { useApi } from "../services/useApi";
import { listFeed } from "../services/api";

export function Chips({ items, tone = "bg-cloud text-ink" }) {
  if (!items?.length) return null;
  return <div className="flex flex-wrap gap-1.5">{items.map((t) => <span key={t} className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{t}</span>)}</div>;
}

export default function FeedList() {
  useApi();
  const [notice, setNotice] = useState(null);
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim();
  const needle = q.toLowerCase();
  const entries = listFeed().filter(({ post: p }) => !needle
    || [p.title, p.description, p.authorName, ...p.skills, ...p.knowledge, ...p.tech].join(" ").toLowerCase().includes(needle));
  return (
    <>
      <Notice notice={notice} />
      {q && (
        <p className="mx-auto mb-4 flex max-w-2xl items-center justify-between gap-3 rounded-lg border border-line-soft bg-white px-4 py-2.5 text-sm text-ink">
          <span>{entries.length} resultado{entries.length === 1 ? "" : "s"} para “<b>{q}</b>”</span>
          <Link to="/feed" className="inline-flex items-center gap-1 text-xs font-semibold text-blue hover:underline"><X className="h-3.5 w-3.5" /> Limpar busca</Link>
        </p>
      )}
      {entries.length === 0 && <p className="rounded-xl border border-line-soft bg-white p-8 text-center text-sm text-muted">{q ? "Nenhum projeto encontrado para essa busca." : "Nenhum projeto no feed ainda."}</p>}
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
                  {p.visibility === "internal" && <span className="inline-flex items-center gap-1 rounded-full bg-draft-bg px-2 py-0.5 text-[11px] font-medium text-draft"><Building2 className="h-3 w-3" /> Só minha instituição</span>}
                  <CategoryChip id={p.category} />
                </div>
              </div>
              <Link to={`/publicacao/${p.id}`}>
                {p.images[0]
                  ? <img src={p.images[0]} alt={`Capa de ${p.title}`} className="mt-3 h-52 w-full object-cover" />
                  : <div className={`mt-3 h-40 bg-gradient-to-br ${p.cover}`} />}
              </Link>
              <div className="space-y-3 p-4">
                <Link to={`/publicacao/${p.id}`} className="block text-base font-bold text-ink hover:text-blue">{p.title}</Link>
                <p className="line-clamp-3 text-sm text-muted">{p.description}</p>
                <Chips items={p.skills} tone="bg-blue-50 text-blue" />
                <Chips items={p.tech} />
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
