import { useState } from "react";
import StageBadge from "../StageBadge";
import * as api from "../../services/api";

export default function OwnerPanel({ post, mentoring, act }) {
  const [reply, setReply] = useState("");
  if (!mentoring.hasLiveMentorship && !mentoring.stage) return null;
  return (
    <section className="rounded-xl border border-line-soft bg-white p-5 shadow-card" aria-labelledby="owner-title">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="owner-title" className="text-sm font-bold text-ink">Acompanhamento da mentoria</h2>
        <StageBadge stage={mentoring.stage} visibility={post.visibility} />
      </div>
      {mentoring.canResubmit && (
        <div className="mb-4 rounded-lg border border-review/30 bg-review-bg p-3">
          <p className="text-sm text-review">O mentor pediu ajustes. Depois de revisar o projeto, reenvie para uma nova avaliação.</p>
          <button onClick={() => act(() => api.resubmitProject(post.id), "Projeto reenviado para avaliação.")} className="mt-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-semibold text-white hover:brightness-110">Reenviar para avaliação</button>
        </div>
      )}
      {mentoring.stage === "approved" && <p className="mb-4 text-sm text-ink">O projeto foi aprovado pelo mentor. A publicação no feed é feita pelo mentor responsável.</p>}
      {mentoring.hasLiveMentorship ? (
        <div>
          <label htmlFor="own-reply" className="block text-xs font-semibold text-ink">Responder ao mentor</label>
          <textarea id="own-reply" rows={3} maxLength={2000} value={reply} onChange={(e) => setReply(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue" />
          <button disabled={!reply.trim()} onClick={() => act(() => { api.replyToFeedback(post.id, reply); setReply(""); }, "Resposta enviada aos mentores.")} className="mt-2 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-blue hover:text-blue disabled:opacity-40">Enviar resposta</button>
        </div>
      ) : (
        <p className="text-sm text-muted">Não há mentoria em andamento no momento.</p>
      )}
    </section>
  );
}
