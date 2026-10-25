import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send, Smile, Plus, Lock, FolderGit2 } from "lucide-react";
import Notice from "./Notice";
import Avatar from "./Avatar";
import { useApi } from "../services/useApi";
import * as api from "../services/api";

const hhmm = (t) => new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const preview = (m) => (m.kind === "project" ? "Projeto compartilhado" : m.body);
const groupPerson = (title) => ({ initials: title.split(" ").map((w) => w[0]).slice(0, 2).join(""), photo: "" });

export default function ChatPanel({ className = "h-[calc(100dvh_-_13rem)] min-h-[420px] max-h-[48rem]", initialId = null }) {
  const { user } = useApi();
  const [active, setActive] = useState(initialId);
  const [text, setText] = useState("");
  const [stickers, setStickers] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ type: "direct", name: "", ids: [], q: "" });
  const [notice, setNotice] = useState(null);
  const endRef = useRef(null);

  const allowed = user.role === "mentor";
  const convs = allowed ? api.listConversations() : [];
  const current = convs.find((c) => c.id === active);
  const msgs = allowed && current ? api.getMessages(current.id) : [];
  const act = (fn) => { try { return fn(); } catch (e) { setNotice({ type: "err", text: e.message }); } };

  useEffect(() => { if (allowed && current && current.unread > 0) api.markRead(current.id); });
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs.length, active]);
  useEffect(() => { setActive(null); }, [user.id]);
  useEffect(() => { if (initialId) setActive(initialId); }, [initialId]);

  if (!allowed) {
    return (
      <>
        <div className="mx-auto max-w-md rounded-xl border border-line-soft bg-white p-8 text-center shadow-card">
          <Lock className="mx-auto h-8 w-8 text-muted" />
          <h1 className="mt-3 text-lg font-bold text-ink">Área exclusiva para mentores</h1>
          <p className="mt-1 text-sm text-muted">Seu perfil não tem acesso ao chat dos mentores.</p>
        </div>
      </>
    );
  }
  const others = api.listMentors(form.q).filter((m) => !m.isMe);
  const missing = !!initialId && active === initialId && !current;
  const send = (kind, body) => act(() => { api.sendMessage(current.id, { kind, body }); if (kind === "text") setText(""); setStickers(false); });
  const create = () => {
    const id = act(() => api.createConversation({ type: form.type, name: form.name, memberIds: form.ids }));
    if (id) { setActive(id); setCreating(false); setForm({ type: "direct", name: "", ids: [], q: "" }); setNotice(null); }
  };
  const toggleId = (id) => setForm((f) => ({ ...f, ids: f.type === "direct" ? [id] : f.ids.includes(id) ? f.ids.filter((x) => x !== id) : [...f.ids, id] }));

  return (
    <>
      {!api.isPersistent() && <Notice notice={{ type: "err", text: "O armazenamento do navegador está indisponível: as mensagens só existem nesta sessão e não são salvas." }} />}
      <Notice notice={notice} />
      {missing && <Notice notice={{ type: "err", text: "Conversa não encontrada ou sem acesso." }} />}
      <div className={`grid ${className} grid-cols-1 overflow-hidden rounded-xl border border-line-soft bg-white shadow-card md:grid-cols-[280px_1fr]`}>
        <div className={`${current ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-line-soft`}>
          <button onClick={() => setCreating((v) => !v)} className="m-3 inline-flex items-center justify-center gap-1.5 rounded-md border border-line px-3 py-2 text-xs font-semibold text-ink hover:border-blue hover:text-blue"><Plus className="h-4 w-4" /> Nova conversa</button>
          {creating && (
            <div className="max-h-72 space-y-2 overflow-y-auto border-y border-line-soft bg-cloud p-3 text-xs">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, ids: [] })} className="w-full rounded-md border border-line bg-white px-2 py-1.5" aria-label="Tipo">
                <option value="direct">Individual</option><option value="group">Grupo</option>
              </select>
              {form.type === "group" && <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do grupo" aria-label="Nome do grupo" className="w-full rounded-md border border-line px-2 py-1.5" />}
              <input value={form.q} onChange={(e) => setForm({ ...form, q: e.target.value })} placeholder="Buscar por nome, especialidade ou instituição" aria-label="Buscar mentores" className="w-full rounded-md border border-line px-2 py-1.5" />
              {others.length === 0 && <p className="text-muted">Nenhum mentor encontrado.</p>}
              {others.map((m) => (
                <label key={m.id} className="flex items-center gap-2">
                  <input type={form.type === "direct" ? "radio" : "checkbox"} name="member" checked={form.ids.includes(m.id)} onChange={() => toggleId(m.id)} />
                  <Avatar person={m} size="xs" />
                  <span className="min-w-0"><span className="block truncate font-semibold text-ink">{m.name}</span><span className="block truncate text-muted">{m.specialties.slice(0, 2).join(", ")}</span></span>
                </label>
              ))}
              <button onClick={create} className="w-full rounded-md bg-brand-gradient px-3 py-1.5 font-semibold text-white">Criar</button>
            </div>
          )}
          <ul className="flex-1 overflow-y-auto">
            {convs.length === 0 && <li className="p-4 text-sm text-muted">Você ainda não tem conversas. Use “Nova conversa” ou a página Conexões para falar com outros mentores.</li>}
            {convs.map((c) => (
              <li key={c.id}>
                <button onClick={() => setActive(c.id)} className={`flex w-full items-center gap-2 px-3 py-3 text-left hover:bg-cloud ${active === c.id ? "bg-blue-50" : ""}`}>
                  <Avatar person={c.peer || groupPerson(c.title)} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{c.title}{c.type === "group" && <span className="ml-1 text-xs font-normal text-muted">grupo</span>}</span>
                    <span className="block truncate text-xs text-muted">{c.last ? preview(c.last) : "Sem mensagens"}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    {c.last && <span className="text-[10px] text-muted">{hhmm(c.last.at)}</span>}
                    {c.unread > 0 && <span className="rounded-full bg-violet px-1.5 py-0.5 text-[10px] font-bold text-white" aria-label={`${c.unread} não lidas`}>{c.unread}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={`${current ? "flex" : "hidden md:flex"} min-h-0 flex-col`}>
          {!current ? (
            <p className="m-auto text-sm text-muted">Selecione uma conversa</p>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-line-soft px-4 py-3">
                <button onClick={() => setActive(null)} className="md:hidden" aria-label="Voltar"><ArrowLeft className="h-5 w-5 text-muted" /></button>
                <Avatar person={current.peer || groupPerson(current.title)} size="sm" />
                <div className="min-w-0">
                  {current.peer ? <Link to={`/mentores/${current.peer.id}`} className="block truncate text-sm font-bold text-ink hover:text-blue">{current.title}</Link> : <p className="truncate text-sm font-bold text-ink">{current.title}</p>}
                  <p className="truncate text-xs text-muted">{current.peer ? current.peer.specialties.slice(0, 3).join(", ") || current.peer.position : current.members.join(", ")}</p>
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-cloud p-4">
                {msgs.length === 0 && <p className="text-center text-sm text-muted">Nenhuma mensagem ainda. Envie a primeira.</p>}
                {msgs.map((m) => (
                  <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${m.kind === "sticker" ? "bg-transparent" : m.mine ? "bg-blue text-white" : "bg-white text-ink shadow-card"}`}>
                      {!m.mine && <p className="text-xs font-semibold text-violet">{m.senderName}</p>}
                      {m.kind === "sticker" && <span className="text-5xl leading-none">{m.body}</span>}
                      {m.kind === "text" && <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>}
                      {m.kind === "project" && (m.project
                        ? <Link to={`/mentor/projetos/${m.project.id}`} className={`flex items-center gap-2 text-sm font-semibold underline ${m.mine ? "text-white" : "text-blue"}`}><FolderGit2 className="h-4 w-4 shrink-0" /> {m.project.title}</Link>
                        : <p className="text-sm italic">Projeto indisponível</p>)}
                      <p className={`mt-0.5 text-right text-[10px] ${m.mine && m.kind !== "sticker" ? "text-white/70" : "text-muted"}`}>{hhmm(m.at)}</p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              {stickers && (
                <div className="grid grid-cols-6 gap-1 border-t border-line-soft bg-white p-2">
                  {api.STICKERS.map((s) => <button key={s} onClick={() => send("sticker", s)} className="rounded-md p-1 text-3xl hover:bg-cloud" aria-label={`Figurinha ${s}`}>{s}</button>)}
                </div>
              )}
              <div className="flex items-center gap-2 border-t border-line-soft p-3">
                <button onClick={() => setStickers((v) => !v)} aria-label="Figurinhas" className={`rounded-md p-2 ${stickers ? "bg-blue-50 text-blue" : "text-muted hover:bg-cloud"}`}><Smile className="h-5 w-5" /></button>
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send("text", text)} maxLength={2000} placeholder="Escreva uma mensagem…" aria-label="Mensagem" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
                <button onClick={() => send("text", text)} aria-label="Enviar" className="rounded-md bg-brand-gradient p-2.5 text-white"><Send className="h-4 w-4" /></button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
