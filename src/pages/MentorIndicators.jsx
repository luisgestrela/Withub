import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { mentorNavFor } from "../components/navs";
import StatCard from "../components/StatCard";
import { fmtDate, fmtDuration } from "../components/mentoring/stages";
import { useApi } from "../services/useApi";
import { mentorIndicators } from "../services/api";

const FORMULAS = [
  ["Projetos acompanhados", "Quantidade de projetos distintos com mentoria aceita, ativa ou encerrada em seu nome."],
  ["Mentorias ativas", "Quantidade de mentorias em que o acompanhamento foi iniciado e ainda não foi encerrado."],
  ["Avaliações realizadas", "Quantidade de decisões registradas por você (aprovações + pedidos de ajustes)."],
  ["Projetos publicados", "Projetos que você acompanha, aprovados e com visibilidade pública definida pelo estudante."],
  ["Tempo médio de resposta", "Média de (data da resposta − data da solicitação) nas solicitações de estudantes que você aceitou ou recusou. Sem respostas, não há valor."],
];

export default function MentorIndicators() {
  const { user } = useApi();
  const i = mentorIndicators();
  return (
    <AppShell nav={mentorNavFor(user.id)} user={user} subtitle="Mentor">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink">Indicadores de atuação</h1>
        <p className="mt-1 text-sm text-muted">Calculados a partir das mentorias, decisões e solicitações registradas na plataforma.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Projetos acompanhados" value={String(i.tracked)} />
        <StatCard label="Mentorias ativas" value={String(i.activeMentorships)} accent="text-blue" />
        <StatCard label="Avaliações realizadas" value={String(i.evaluations)} accent="text-violet" />
        <StatCard label="Projetos publicados" value={String(i.published)} accent="text-approved" />
        <StatCard label="Aprovações" value={String(i.approvals)} accent="text-approved" />
        <StatCard label="Ajustes solicitados" value={String(i.adjustmentsRequested)} accent="text-review" />
        <StatCard label="Solicitações pendentes" value={String(i.pendingRequests)} accent="text-blue" />
        <StatCard label="Tempo médio de resposta" value={fmtDuration(i.avgResponseMs)} />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-line-soft bg-white p-5 shadow-card" aria-labelledby="ind-hist">
          <h2 id="ind-hist" className="text-base font-bold text-ink">Histórico de avaliações</h2>
          {i.decisions.length === 0 ? <p className="mt-3 text-sm text-muted">Você ainda não registrou nenhuma decisão.</p> : (
            <ul className="mt-3 divide-y divide-line-soft">
              {i.decisions.map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-2 py-3">
                  <div>
                    <Link to={`/mentor/projetos/${d.projectId}`} className="text-sm font-semibold text-ink hover:text-blue">{d.title}</Link>
                    <p className="text-xs text-muted">{d.student} · {fmtDate(d.at)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${d.to === "approved" ? "bg-approved-bg text-approved" : "bg-review-bg text-review"}`}>{d.to === "approved" ? "Aprovado" : "Ajustes solicitados"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border border-line-soft bg-white p-5 shadow-card" aria-labelledby="ind-formulas">
          <h2 id="ind-formulas" className="text-base font-bold text-ink">Como cada indicador é calculado</h2>
          <dl className="mt-3 space-y-3">
            {FORMULAS.map(([t, f]) => <div key={t}><dt className="text-sm font-semibold text-ink">{t}</dt><dd className="text-xs text-muted">{f}</dd></div>)}
          </dl>
        </section>
      </div>
    </AppShell>
  );
}
