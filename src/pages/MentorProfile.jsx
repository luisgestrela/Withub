import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Building2, GraduationCap, MessageSquare } from "lucide-react";
import SocialShell from "../components/SocialShell";
import Avatar from "../components/Avatar";
import Notice from "../components/Notice";
import CategoryChip from "../components/CategoryChip";
import { plainFieldClass } from "../components/FormField";
import { categories } from "../data/projects";
import { useApi } from "../services/useApi";
import { readPhoto } from "../services/photo";
import * as api from "../services/api";

const card = "rounded-xl border border-line-soft bg-white p-5 shadow-card";
const LINKS = [["linkedin", "LinkedIn"], ["github", "GitHub"], ["portfolio", "Portfólio"]];

function ProjectList({ items }) {
  return (
    <ul className="divide-y divide-line-soft">
      {items.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
          <Link to={`/publicacao/${p.id}`} className="text-sm font-semibold text-ink hover:text-blue">{p.title}</Link>
          <CategoryChip id={p.category} />
        </li>
      ))}
    </ul>
  );
}

export default function MentorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useApi();
  const [notice, setNotice] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [projectId, setProjectId] = useState("");
  const fileRef = useRef(null);

  let profile = null;
  try { profile = api.getMentorProfile(id); } catch { profile = null; }
  const fail = (e) => setNotice({ type: "err", text: e.message || String(e) });
  const act = (fn, ok) => { try { fn(); if (ok) setNotice({ type: "ok", text: ok }); } catch (e) { fail(e); } };

  if (!profile) {
    return (
      <SocialShell>
        <p className="rounded-xl border border-line-soft bg-white p-8 text-center text-sm text-muted">Mentor não encontrado.</p>
        <Link to="/feed" className="mt-4 inline-block text-sm text-blue">Voltar ao feed</Link>
      </SocialShell>
    );
  }

  const myProjects = user.role === "student" ? api.listMyProjects() : [];
  const startEdit = () => {
    setDraft({
      name: profile.name, institution: profile.institution, position: profile.position, specialties: profile.specialties.join(", "), steamAreas: profile.steamAreas,
      bio: profile.bio, education: profile.education, experience: profile.experience, links: { linkedin: "", github: "", portfolio: "", ...profile.links }, photo: profile.photo,
    });
    setEditing(true);
    setNotice(null);
  };
  const save = () => act(() => {
    api.updateMentorProfile({ ...draft, specialties: api.parseList(draft.specialties) });
    setEditing(false);
  }, "Perfil atualizado.");
  const pickPhoto = async (file) => {
    if (!file) return;
    try { const photo = await readPhoto(file); setDraft((d) => ({ ...d, photo })); } catch (e) { fail(e); }
  };
  const toggleArea = (a) => setDraft((d) => ({ ...d, steamAreas: d.steamAreas.includes(a) ? d.steamAreas.filter((x) => x !== a) : [...d.steamAreas, a] }));
  const chat = () => act(() => navigate(`/mentor/chat/${api.startDirectChat(profile.id)}`));
  const ind = profile.indicators;

  return (
    <SocialShell>
      <Notice notice={notice} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <section className={card}>
            {editing ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <Avatar person={{ initials: profile.initials, photo: draft.photo }} size="xl" />
                  <div className="space-x-2">
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { pickPhoto(e.target.files[0]); e.target.value = ""; }} />
                    <button type="button" onClick={() => fileRef.current?.click()} className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-blue hover:text-blue">Alterar foto</button>
                    {draft.photo && <button type="button" onClick={() => setDraft({ ...draft, photo: "" })} className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:text-red-600">Remover</button>}
                  </div>
                </div>
                {[["name", "Nome completo"], ["institution", "Instituição ou empresa"], ["position", "Cargo ou área de atuação"], ["specialties", "Especialidades (separe por vírgula)"], ["education", "Formação"]].map(([k, l]) => (
                  <div key={k}><label htmlFor={`pf-${k}`} className="block text-xs font-medium text-muted">{l}</label><input id={`pf-${k}`} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} className={plainFieldClass} /></div>
                ))}
                <div><label htmlFor="pf-experience" className="block text-xs font-medium text-muted">Experiência</label><textarea id="pf-experience" rows={3} maxLength={600} value={draft.experience} onChange={(e) => setDraft({ ...draft, experience: e.target.value })} className={plainFieldClass} /></div>
                <div><label htmlFor="pf-bio" className="block text-xs font-medium text-muted">Biografia e como pode ajudar os estudantes</label><textarea id="pf-bio" rows={4} maxLength={600} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} className={plainFieldClass} /></div>
                <fieldset>
                  <legend className="text-xs font-medium text-muted">Áreas STEAM de interesse</legend>
                  <div className="mt-1 flex flex-wrap gap-3">
                    {categories.map((c) => <label key={c.id} className="flex items-center gap-1.5 text-sm text-ink"><input type="checkbox" checked={draft.steamAreas.includes(c.id)} onChange={() => toggleArea(c.id)} /> {c.label}</label>)}
                  </div>
                </fieldset>
                {LINKS.map(([k, l]) => (
                  <div key={k}><label htmlFor={`pf-${k}`} className="block text-xs font-medium text-muted">{l} (opcional)</label><input id={`pf-${k}`} value={draft.links[k]} onChange={(e) => setDraft({ ...draft, links: { ...draft.links, [k]: e.target.value } })} placeholder="https://" className={plainFieldClass} /></div>
                ))}
                <div className="flex gap-2">
                  <button onClick={save} className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-semibold text-white">Salvar</button>
                  <button onClick={() => setEditing(false)} className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar person={profile} size="xl" />
                <div className="min-w-0 flex-1 space-y-1">
                  <h1 className="text-2xl font-bold text-ink">{profile.name}</h1>
                  <p className="text-sm text-ink">{profile.position}</p>
                  <p className="flex items-center gap-1.5 text-sm text-muted"><Building2 className="h-4 w-4" /> {profile.institution}</p>
                  {profile.education && <p className="flex items-center gap-1.5 text-sm text-muted"><GraduationCap className="h-4 w-4" /> {profile.education}</p>}
                  {profile.demo && <p className="pt-1 text-xs text-muted">Perfil de demonstração.</p>}
                </div>
              </div>
            )}
          </section>

          {!editing && (
            <>
              <section className={card}>
                <h2 className="mb-2 text-sm font-bold text-ink">Especialidades</h2>
                <div className="flex flex-wrap gap-1.5">{profile.specialties.map((s) => <span key={s} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue">{s}</span>)}</div>
                {profile.steamAreas.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{profile.steamAreas.map((a) => <CategoryChip key={a} id={a} size="md" />)}</div>}
              </section>
              {(profile.bio || profile.experience) && (
                <section className={card}>
                  {profile.bio && <><h2 className="mb-1 text-sm font-bold text-ink">Sobre</h2><p className="whitespace-pre-line text-sm text-ink">{profile.bio}</p></>}
                  {profile.experience && <><h2 className="mb-1 mt-4 text-sm font-bold text-ink">Experiência</h2><p className="whitespace-pre-line text-sm text-ink">{profile.experience}</p></>}
                </section>
              )}
              <section className={card}>
                <h2 className="mb-2 text-sm font-bold text-ink">Projetos acompanhados</h2>
                {profile.following.length === 0 ? <p className="text-sm text-muted">Nenhum projeto visível no momento.</p> : <ProjectList items={profile.following} />}
                {profile.past.length > 0 && <><h2 className="mb-2 mt-5 text-sm font-bold text-ink">Projetos em que participou como mentor</h2><ProjectList items={profile.past} /></>}
              </section>
            </>
          )}
        </div>

        <aside className="space-y-6">
          <div className={card}>
            <h2 className="mb-3 text-sm font-bold text-ink">Atuação</h2>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div><dd className="font-mono-num text-xl font-bold text-ink">{ind.tracked}</dd><dt className="text-[11px] text-muted">Projetos</dt></div>
              <div><dd className="font-mono-num text-xl font-bold text-blue">{ind.active}</dd><dt className="text-[11px] text-muted">Ativas</dt></div>
              <div><dd className="font-mono-num text-xl font-bold text-violet">{ind.evaluations}</dd><dt className="text-[11px] text-muted">Avaliações</dt></div>
            </dl>
          </div>
          {Object.keys(profile.links).length > 0 && (
            <div className={card}>
              <h2 className="mb-2 text-sm font-bold text-ink">Links profissionais</h2>
              <ul className="space-y-1.5">
                {LINKS.filter(([k]) => profile.links[k]).map(([k, l]) => <li key={k}><a href={profile.links[k]} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue hover:underline">{l} ↗</a></li>)}
              </ul>
            </div>
          )}
          {profile.own && !editing && profile.demo === false && (
            <div className={card}><button onClick={startEdit} className="w-full rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink hover:border-blue hover:text-blue">Editar perfil</button></div>
          )}
          {!profile.own && user.role === "mentor" && (
            <div className={card}><button onClick={chat} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-gradient px-3 py-2 text-sm font-semibold text-white hover:brightness-110"><MessageSquare className="h-4 w-4" /> Conversar</button></div>
          )}
          {user.role === "student" && (
            <div className={card}>
              <h2 className="mb-2 text-sm font-bold text-ink">Solicitar mentoria</h2>
              {myProjects.length === 0 ? <p className="text-sm text-muted">Publique um projeto para poder solicitar mentoria.</p> : (
                <>
                  <label htmlFor="rq-project" className="block text-xs font-medium text-muted">Projeto</label>
                  <select id="rq-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={`mt-1 ${plainFieldClass}`}>
                    <option value="">Selecione um projeto</option>
                    {myProjects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                  <button disabled={!projectId} onClick={() => act(() => { api.requestMentorship(projectId, profile.id); setProjectId(""); }, "Solicitação enviada ao mentor.")} className="mt-2 w-full rounded-md bg-brand-gradient px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Enviar solicitação</button>
                </>
              )}
            </div>
          )}
        </aside>
      </div>
    </SocialShell>
  );
}
