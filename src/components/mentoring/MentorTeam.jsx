import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import Avatar from "../Avatar";
import { useApi } from "../../services/useApi";
import * as api from "../../services/api";
import { MEMBER_STYLE, fmtDate } from "./stages";

const btn = "inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-blue hover:text-blue";
const select = "min-w-0 flex-1 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink";

export default function MentorTeam({ post, mentoring, act }) {
  const { user } = useApi();
  const navigate = useNavigate();
  const [pick, setPick] = useState("");
  const [invitee, setInvitee] = useState("");
  const team = api.getTeam(post.id);
  const taken = new Set(team.filter((m) => ["requested", "accepted", "active"].includes(m.status)).map((m) => m.mentorId));
  const candidates = api.listMentors().filter((m) => !m.isMe && !taken.has(m.id));
  const owner = post.perms.owner && user.role === "student";
  const mentorViewer = user.role === "mentor";
  const chat = (mentorId) => act(() => navigate(`/mentor/chat/${api.startDirectChat(mentorId, post.id)}`));

  return (
    <section className="rounded-xl border border-line-soft bg-white p-5 shadow-card" aria-labelledby="team-title">
      <h2 id="team-title" className="mb-3 text-sm font-bold text-ink">Equipe de mentoria</h2>
      {team.length === 0 && <p className="text-sm text-muted">Este projeto ainda não tem mentores vinculados.</p>}
      <ul className="space-y-3">
        {team.map((m) => (
          <li key={m.id} className="rounded-lg border border-line-soft p-3">
            <div className="flex items-start gap-3">
              <Avatar person={m} size="md" />
              <div className="min-w-0 flex-1">
                <Link to={`/mentores/${m.mentorId}`} className="text-sm font-semibold text-ink hover:text-blue">{m.name}</Link>
                <p className="text-xs text-muted">{m.position || m.specialties.slice(0, 2).join(", ")}</p>
                <p className="mt-0.5 text-xs text-muted">{m.role}{m.startedAt ? ` · desde ${fmtDate(m.startedAt)}` : ""}{m.endedAt ? ` · encerrada em ${fmtDate(m.endedAt)}` : ""}</p>
                {m.invitedByName && <p className="text-xs text-muted">Convidado por {m.invitedByName}</p>}
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${MEMBER_STYLE[m.status]}`}>{m.statusLabel}</span>
            </div>
            {m.specialties.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {m.specialties.slice(0, 3).map((s) => <span key={s} className="rounded-full bg-cloud px-2 py-0.5 text-[11px] font-medium text-ink">{s}</span>)}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={`/mentores/${m.mentorId}`} className={btn}>Ver perfil</Link>
              {mentorViewer && m.mentorId !== user.id && ["accepted", "active", "ended"].includes(m.status) && (
                <button onClick={() => chat(m.mentorId)} className={btn}><MessageSquare className="h-3.5 w-3.5" /> Conversar com este mentor</button>
              )}
              {owner && m.canRespond && (
                <>
                  <button onClick={() => act(() => api.respondMentorship(m.id, true), "Mentoria autorizada.")} className="rounded-md bg-approved px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110">Autorizar</button>
                  <button onClick={() => window.confirm(`Recusar a mentoria de ${m.name}?`) && act(() => api.respondMentorship(m.id, false), "Mentoria recusada.")} className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Recusar</button>
                </>
              )}
              {owner && m.canEnd && (
                <button onClick={() => window.confirm(`Encerrar a mentoria de ${m.name}? O acompanhamento será finalizado.`) && act(() => api.endMentorship(m.id), "Mentoria encerrada.")} className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Encerrar mentoria</button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {owner && (
        <div className="mt-4 border-t border-line-soft pt-4">
          <label htmlFor="req-mentor" className="block text-xs font-medium text-muted">Solicitar mentoria a</label>
          <div className="mt-1 flex gap-2">
            <select id="req-mentor" value={pick} onChange={(e) => setPick(e.target.value)} className={select}>
              <option value="">Selecione um mentor</option>
              {candidates.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.specialties.slice(0, 2).join(", ")}</option>)}
            </select>
            <button disabled={!pick} onClick={() => act(() => { api.requestMentorship(post.id, pick); setPick(""); }, "Solicitação enviada ao mentor.")} className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Solicitar</button>
          </div>
          {candidates.length === 0 && <p className="mt-2 text-xs text-muted">Não há outros mentores disponíveis para solicitar.</p>}
        </div>
      )}

      {mentorViewer && mentoring.canOffer && (
        <div className="mt-4 border-t border-line-soft pt-4">
          <button onClick={() => act(() => api.offerMentorship(post.id), "Oferta enviada. O estudante precisa autorizar.")} className={btn}>Oferecer mentoria a este projeto</button>
          <p className="mt-1.5 text-xs text-muted">A mentoria só começa depois que o estudante autorizar.</p>
        </div>
      )}

      {mentorViewer && mentoring.canReview && (
        <div className="mt-4 border-t border-line-soft pt-4">
          <label htmlFor="inv-mentor" className="block text-xs font-medium text-muted">Convidar mentor colaborador</label>
          <div className="mt-1 flex gap-2">
            <select id="inv-mentor" value={invitee} onChange={(e) => setInvitee(e.target.value)} className={select}>
              <option value="">Selecione um mentor</option>
              {candidates.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.specialties.slice(0, 2).join(", ")}</option>)}
            </select>
            <button disabled={!invitee} onClick={() => act(() => { api.inviteMentor(post.id, invitee); setInvitee(""); }, "Convite enviado. O estudante precisa autorizar.")} className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-blue hover:text-blue disabled:opacity-40">Convidar</button>
          </div>
        </div>
      )}
    </section>
  );
}
