import { useState, useRef } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Lock, FileText, Download, Trash2, Pencil } from "lucide-react";
import SocialShell from "../components/SocialShell";
import CategoryChip from "../components/CategoryChip";
import PostActions from "../components/PostActions";
import Notice from "../components/Notice";
import RecommendedNotice from "../components/RecommendedNotice";
import CopyLinkButton from "../components/CopyLinkButton";
import LicenseCard from "../components/LicenseCard";
import { Chips } from "../components/FeedList";
import StageBadge from "../components/StageBadge";
import MentoringSection from "../components/mentoring/MentoringSection";
import { useApi } from "../services/useApi";
import * as api from "../services/api";

const kb = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApi();
  const [notice, setNotice] = useState(() => (location.state?.created ? { type: "ok", text: "Projeto salvo com sucesso." } : null));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [comment, setComment] = useState("");
  const fileRef = useRef(null);

  let post = null;
  try { post = api.getPost(id); } catch { /* 404 */ }
  const fail = (e) => setNotice({ type: "err", text: e.message || e });
  const act = (fn, ok) => { try { fn(); if (ok) setNotice({ type: "ok", text: ok }); } catch (e) { fail(e); } };

  if (!post) {
    return (
      <SocialShell>
        <p className="rounded-xl border border-line-soft bg-white p-8 text-center text-sm text-muted">Projeto não encontrado.</p>
        <Link to={location.pathname.startsWith("/mentor/") ? "/mentor/projetos" : "/feed"} className="mt-4 inline-block text-sm text-blue">Voltar</Link>
      </SocialShell>
    );
  }
  const { perms } = post;
  let files = [];
  if (perms.restricted) { try { files = api.getRestrictedFiles(id); } catch { /* sem acesso */ } }
  const comments = api.listComments(id);
  const mentors = api.listMentors();
  const mentoring = api.getMentoringState(id);
  const fromMentor = location.pathname.startsWith("/mentor/");

  const startEdit = () => {
    setDraft({ title: post.title, description: post.description, skills: post.skills.join(", "), knowledge: post.knowledge.join(", "), tech: post.tech.join(", ") });
    setEditing(true);
  };
  const saveEdit = () => act(() => {
    api.updateProject(id, { title: draft.title, description: draft.description, skills: api.parseList(draft.skills), knowledge: api.parseList(draft.knowledge), tech: api.parseList(draft.tech) });
    setEditing(false);
  }, "Projeto atualizado.");
  const onDownload = (f) => act(() => {
    const r = api.downloadRestricted(id, f.id);
    if (!r.url) return setNotice({ type: "ok", text: `"${r.name}" é um arquivo de demonstração (sem conteúdo no protótipo).` });
    const a = document.createElement("a"); a.href = r.url; a.download = r.name; a.click(); URL.revokeObjectURL(r.url);
  });
  const addFiles = (list) => act(() => api.addRestrictedFiles(id, Array.from(list)), "Arquivos restritos adicionados.");

  return (
    <SocialShell>
      <Link to={fromMentor ? "/mentor/projetos" : "/feed"} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-blue"><ArrowLeft className="h-4 w-4" /> {fromMentor ? "Voltar aos meus projetos" : "Voltar ao feed"}</Link>
      <Notice notice={notice} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-xl border border-line-soft bg-white shadow-card">
            {post.images[0] ? <img src={post.images[0]} alt={`Capa de ${post.title}`} className="h-56 w-full object-cover" /> : <div className={`h-40 bg-gradient-to-br ${post.cover}`} />}
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryChip id={post.category} size="md" />
                {mentoring.canHistory && <StageBadge stage={mentoring.stage} visibility={post.visibility} />}
                {post.seekingMentor && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet">Procura mentoria</span>}
                {post.visibility === "private" && <span className="rounded-full bg-draft-bg px-2.5 py-1 text-xs font-medium text-draft">Rascunho privado</span>}
                {post.visibility === "internal" && <span className="rounded-full bg-draft-bg px-2.5 py-1 text-xs font-medium text-draft">Visível só à instituição (estudantes e mentores)</span>}
                {post.publishRequested && post.visibility !== "public" && <span className="rounded-full bg-review-bg px-2.5 py-1 text-xs font-medium text-review">Aguardando publicação pelo mentor</span>}
              </div>
              {editing ? (
                <div className="space-y-3">
                  <input className="w-full rounded-lg border border-line px-3 py-2 text-sm" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-label="Título" />
                  <textarea rows={5} className="w-full rounded-lg border border-line px-3 py-2 text-sm" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} aria-label="Descrição" />
                  {[["skills", "Skills (separe por vírgula)"], ["knowledge", "Conhecimentos adquiridos"], ["tech", "Tecnologias utilizadas"]].map(([k, l]) => (
                    <input key={k} placeholder={l} aria-label={l} className="w-full rounded-lg border border-line px-3 py-2 text-sm" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
                  ))}
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-semibold text-white">Salvar</button>
                    <button onClick={() => setEditing(false)} className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink">Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-ink">{post.title}</h1>
                  <p className="text-sm text-muted">por <strong className="text-ink">{post.authorName}</strong> · {new Date(post.createdAt).toLocaleDateString("pt-BR")}</p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{post.description}</p>
                </>
              )}
            </div>
          </section>

          {!editing && (post.skills.length > 0 || post.knowledge.length > 0 || post.tech.length > 0) && (
            <section className="space-y-4 rounded-xl border border-line-soft bg-white p-5 shadow-card">
              {post.skills.length > 0 && <div><h2 className="mb-2 text-sm font-bold text-ink">Skills desenvolvidas</h2><Chips items={post.skills} tone="bg-blue-50 text-blue" /></div>}
              {post.knowledge.length > 0 && <div><h2 className="mb-2 text-sm font-bold text-ink">Conhecimentos adquiridos</h2><Chips items={post.knowledge} tone="bg-violet-50 text-violet" /></div>}
              {post.tech.length > 0 && <div><h2 className="mb-2 text-sm font-bold text-ink">Tecnologias utilizadas</h2><Chips items={post.tech} /></div>}
            </section>
          )}

          {post.images.length > 1 && (
            <section className="rounded-xl border border-line-soft bg-white p-5 shadow-card">
              <h2 className="mb-3 text-sm font-bold text-ink">Galeria</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {post.images.map((src, i) => <img key={i} src={src} alt={`Imagem ${i + 1} de ${post.title}`} className="h-32 w-full rounded-lg object-cover" />)}
              </div>
            </section>
          )}

          <MentoringSection post={post} act={act} />

          {perms.restricted && (
            <section className="rounded-xl border border-violet/30 bg-white p-5 shadow-card">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-ink"><Lock className="h-4 w-4 text-violet" /> Arquivos confidenciais</h2>
              <p className="mb-3 text-xs text-muted">{perms.owner ? "Acesso restrito: apenas empresas parceiras com recrutadores e a própria instituição podem acessar. Você e os mentores vinculados também veem." : "Acesso de mentor vinculado — somente leitura."}</p>
              {perms.owner && files.length === 0 && <div className="mb-3"><RecommendedNotice /></div>}
              {files.length === 0 && !perms.owner && <p className="text-sm text-muted">Nenhum arquivo restrito neste projeto.</p>}
              <ul className="space-y-2">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 rounded-md border border-line-soft px-3 py-2">
                    <FileText className="h-4 w-4 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{f.name}</span>
                    <span className="text-xs text-muted">{kb(f.size)}</span>
                    <button onClick={() => onDownload(f)} aria-label={`Baixar ${f.name}`} className="rounded p-1 text-muted hover:text-blue"><Download className="h-4 w-4" /></button>
                    {perms.owner && <button onClick={() => window.confirm(`Remover "${f.name}"?`) && act(() => api.removeRestrictedFile(id, f.id), "Arquivo removido.")} aria-label={`Remover ${f.name}`} className="rounded p-1 text-muted hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                  </li>
                ))}
              </ul>
              {perms.owner && (
                <>
                  <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                  <button onClick={() => fileRef.current?.click()} className="mt-3 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-blue hover:text-blue">Adicionar arquivos confidenciais</button>
                </>
              )}
            </section>
          )}

          <section className="rounded-xl border border-line-soft bg-white p-5 shadow-card">
            <h2 className="mb-3 text-sm font-bold text-ink">Comentários ({comments.length})</h2>
            <div className="space-y-3">
              {comments.length === 0 && <p className="text-sm text-muted">Seja o primeiro a comentar.</p>}
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-cloud px-3 py-2">
                  <p className="text-xs font-semibold text-ink">{c.authorName} <span className="font-normal text-muted">· {new Date(c.at).toLocaleString("pt-BR")}</span></p>
                  <p className="text-sm text-ink">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} placeholder="Escreva um comentário…" aria-label="Comentário" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
              <button onClick={() => act(() => { api.addComment(id, comment); setComment(""); })} className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-semibold text-white">Comentar</button>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-line-soft bg-white p-5 shadow-card">
            <PostActions post={post} onError={(t) => fail(t)} />
          </div>
          <LicenseCard license={post.license} />
          {perms.owner && (
            <div className="space-y-2 rounded-xl border border-line-soft bg-white p-5 shadow-card">
              <h3 className="text-sm font-bold text-ink">Compartilhar</h3>
              <CopyLinkButton id={post.id} className="w-full" label="Copiar link do projeto" />
              <p className="text-xs text-muted">{post.visibility === "public" ? "Qualquer pessoa com conta na plataforma pode abrir este link." : "Este projeto ainda não é público: só quem tem acesso a ele (você, mentores vinculados e, se interno, sua instituição) consegue abrir o link."}</p>
            </div>
          )}
          {perms.edit && !editing && (
            <div className="rounded-xl border border-line-soft bg-white p-5 shadow-card">
              <button onClick={startEdit} className="flex w-full items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink hover:border-blue hover:text-blue"><Pencil className="h-4 w-4" /> Editar projeto</button>
            </div>
          )}
          {perms.owner && (
            <div className="space-y-3 rounded-xl border border-line-soft bg-white p-5 shadow-card">
              <h3 className="text-sm font-bold text-ink">Gerenciar</h3>
              <label htmlFor="vis" className="block text-xs font-medium text-muted">Visibilidade</label>
              <select id="vis" value={post.visibility} onChange={(e) => act(() => api.updateProject(id, { visibility: e.target.value }), "Visibilidade alterada.")} className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink">
                <option value="private">Privado (só você)</option>
                <option value="internal">Interno (estudantes e mentores da sua instituição)</option>
                <option value="public" disabled={post.visibility !== "public"}>Público (feed){post.visibility !== "public" ? " — só o mentor publica" : ""}</option>
              </select>
              {post.visibility !== "public" && <p className="text-xs text-muted">Para ir ao feed, o projeto precisa ser aprovado e publicado pelo seu mentor.</p>}
              {user.role === "student" && (
                <label className="flex items-center gap-2 text-xs font-medium text-ink">
                  <input type="checkbox" checked={post.seekingMentor} onChange={(e) => act(() => api.updateProject(id, { seekingMentor: e.target.checked }), e.target.checked ? "Projeto sinalizado como procurando mentoria." : "Sinalização de mentoria removida.")} /> Estou procurando mentoria
                </label>
              )}
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted">Permitir que mentores editem:</p>
                {mentors.map((m) => {
                  const on = !!post.grants?.[m.id];
                  return (
                    <label key={m.id} className="flex items-center gap-2 py-1 text-xs text-ink">
                      <input type="checkbox" checked={on} onChange={() => act(() => api.setEditGrant(id, m.id, !on))} /> {m.name}
                    </label>
                  );
                })}
              </div>
              <button onClick={() => window.confirm("Excluir este projeto definitivamente?") && act(() => { api.deleteProject(id); navigate("/feed"); })} className="flex w-full items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Excluir projeto</button>
            </div>
          )}
        </aside>
      </div>
    </SocialShell>
  );
}
