import { useState } from "react";
import { Calendar } from "lucide-react";
import * as api from "../../services/api";
import { fmtDateTime } from "./stages";

const STATUS = { scheduled: "Agendado", done: "Realizado", cancelled: "Cancelado" };

export default function Meetings({ post, mentoring, act }) {
  const [at, setAt] = useState("");
  const [note, setNote] = useState("");
  const meetings = api.listMeetings(post.id);
  return (
    <section className="rounded-xl border border-line-soft bg-white p-5 shadow-card" aria-labelledby="meet-title">
      <h2 id="meet-title" className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Calendar className="h-4 w-4 text-muted" /> Agenda de mentorias</h2>
      {meetings.length === 0 && <p className="text-sm text-muted">Nenhum encontro registrado.</p>}
      <ul className="space-y-2">
        {meetings.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line-soft px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{fmtDateTime(m.at)}</p>
              <p className="text-xs text-muted">Organizado por {m.organizerName}{m.note ? ` · ${m.note}` : ""}</p>
            </div>
            <span className="rounded-full bg-cloud px-2 py-0.5 text-[11px] font-medium text-ink">{STATUS[m.status]}</span>
            {mentoring.canReview && m.status === "scheduled" && (
              <>
                <button onClick={() => act(() => api.setMeetingStatus(m.id, "done"), "Encontro marcado como realizado.")} className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-ink hover:border-blue hover:text-blue">Concluir</button>
                <button onClick={() => window.confirm("Cancelar este encontro?") && act(() => api.setMeetingStatus(m.id, "cancelled"), "Encontro cancelado.")} className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Cancelar</button>
              </>
            )}
          </li>
        ))}
      </ul>
      {mentoring.canReview && (
        <div className="mt-4 grid grid-cols-1 gap-2 border-t border-line-soft pt-4 sm:grid-cols-[200px_1fr_auto]">
          <div>
            <label htmlFor="mt-at" className="block text-xs font-medium text-muted">Data e horário</label>
            <input id="mt-at" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className="mt-1 w-full rounded-md border border-line px-2 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="mt-note" className="block text-xs font-medium text-muted">Pauta (opcional)</label>
            <input id="mt-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm" />
          </div>
          <button onClick={() => act(() => { api.scheduleMeeting(post.id, { at, note }); setAt(""); setNote(""); }, "Encontro agendado.")} className="self-end rounded-md bg-brand-gradient px-4 py-2 text-sm font-semibold text-white">Agendar</button>
        </div>
      )}
    </section>
  );
}
