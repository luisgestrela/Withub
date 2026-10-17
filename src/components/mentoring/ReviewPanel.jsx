import { useState } from "react";
import { Check, PenLine } from "lucide-react";
import StageBadge from "../StageBadge";
import * as api from "../../services/api";

const area = "w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue";
const label = "block text-xs font-semibold text-ink";
const ghost = "rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-blue hover:text-blue disabled:opacity-40";

export default function ReviewPanel({ post, mentoring, act }) {
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState("");
  const [why, setWhy] = useState("");
  const mine = mentoring.mine;
  if (!mine) return null;
  const pendingFromStudent = mine.status === "requested" && mine.initiator === "student";

  return (
    <section className="rounded-xl border border-blue/30 bg-white p-5 shadow-card" aria-labelledby="review-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="review-title" className="text-sm font-bold text-ink">Avaliação do mentor</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Sua participação: <b className="text-ink">{api.MENTORSHIP_LABEL[mine.status]}</b></span>
          <StageBadge stage={mentoring.stage} visibility={post.visibility} />
        </div>
      </div>

      {pendingFromStudent && (
        <div className="space-y-3">
          <p className="text-sm text-ink">Você recebeu uma solicitação de mentoria para este projeto.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => act(() => api.respondMentorship(mine.id, true), "Solicitação aceita.")} className="rounded-md bg-approved px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110">Aceitar solicitação</button>
            <button onClick={() => window.confirm("Recusar esta solicitação de mentoria?") && act(() => api.respondMentorship(mine.id, false), "Solicitação recusada.")} className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Recusar</button>
          </div>
        </div>
      )}
      {mine.status === "requested" && mine.initiator === "mentor" && <p className="text-sm text-muted">Aguardando a autorização do estudante para iniciar a mentoria.</p>}
      {mine.status === "declined" && <p className="text-sm text-muted">Esta solicitação foi recusada.</p>}
      {mine.status === "ended" && <p className="text-sm text-muted">Sua mentoria neste projeto foi encerrada. O histórico continua disponível.</p>}

      {mine.status === "accepted" && (
        <div className="mb-4 space-y-2">
          <p className="text-sm text-ink">Mentoria aceita. Inicie o acompanhamento para poder avaliar o projeto.</p>
          <button onClick={() => act(() => api.startMentorship(mine.id), "Acompanhamento iniciado.")} className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-semibold text-white hover:brightness-110">Iniciar acompanhamento</button>
        </div>
      )}

      {mentoring.canNote && (
        <div className="space-y-4">
          <div>
            <label htmlFor="rv-note" className={label}>Orientação privada</label>
            <p className="mb-1 text-xs text-muted">Visível apenas para os mentores deste projeto. O estudante não vê.</p>
            <textarea id="rv-note" rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} className={area} />
            <button disabled={!note.trim()} onClick={() => act(() => { api.addPrivateNote(post.id, note); setNote(""); }, "Orientação privada registrada.")} className={`mt-2 ${ghost}`}>Salvar orientação</button>
          </div>

          {mentoring.canReview && (
            <>
              <div>
                <label htmlFor="rv-feedback" className={label}>Feedback ao estudante</label>
                <p className="mb-1 text-xs text-muted">O estudante é notificado e vê este texto no histórico.</p>
                <textarea id="rv-feedback" rows={3} maxLength={2000} value={feedback} onChange={(e) => setFeedback(e.target.value)} className={area} />
                <button disabled={!feedback.trim()} onClick={() => act(() => { api.sendFeedback(post.id, feedback); setFeedback(""); }, "Feedback enviado ao estudante.")} className={`mt-2 ${ghost}`}>Enviar feedback</button>
              </div>

              <div className="border-t border-line-soft pt-4">
                <label htmlFor="rv-why" className={label}>Justificativa da decisão</label>
                <p className="mb-1 text-xs text-muted">Obrigatória para solicitar ajustes. Aprovar não publica o projeto: a visibilidade continua com o estudante.</p>
                <textarea id="rv-why" rows={3} maxLength={2000} value={why} onChange={(e) => setWhy(e.target.value)} className={area} />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button disabled={!mentoring.transitions.approve} onClick={() => act(() => { api.evaluateProject(post.id, { decision: "approve", justification: why }); setWhy(""); }, "Projeto aprovado.")} className="inline-flex items-center gap-1.5 rounded-md bg-approved px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-40"><Check className="h-3.5 w-3.5" /> Aprovar projeto</button>
                  <button disabled={!mentoring.transitions.adjustments} onClick={() => act(() => { api.evaluateProject(post.id, { decision: "adjustments", justification: why }); setWhy(""); }, "Ajustes solicitados ao estudante.")} className="inline-flex items-center gap-1.5 rounded-md border border-review bg-review-bg px-3 py-1.5 text-xs font-semibold text-review hover:brightness-95 disabled:opacity-40"><PenLine className="h-3.5 w-3.5" /> Solicitar ajustes</button>
                </div>
                {!mentoring.transitions.approve && !mentoring.transitions.adjustments && (
                  <p className="mt-2 text-xs text-muted">A etapa atual ({mentoring.stageLabel || "sem etapa"}) não permite decisão. Quando o estudante reenviar o projeto, a avaliação é liberada.</p>
                )}
              </div>
            </>
          )}

          <div className="border-t border-line-soft pt-4">
            <button onClick={() => window.confirm("Encerrar sua mentoria neste projeto? O acompanhamento será finalizado.") && act(() => api.endMentorship(mine.id), "Mentoria encerrada.")} className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Encerrar mentoria</button>
          </div>
        </div>
      )}
    </section>
  );
}
