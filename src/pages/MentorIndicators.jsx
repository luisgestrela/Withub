import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ClipboardCheck, 
  Compass, 
  BarChart3, 
  Users, 
  TrendingUp, 
  Mail, 
  FileText 
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { reviewQueue, reviewHistory } from "../data/projects";

const nav = [
  { to: "/mentor", label: "Fila de Validação", icon: ClipboardCheck },
  { to: "/mentor/explorar", label: "Explorar Instituição", icon: Compass },
  { to: "/mentor/indicadores", label: "Indicadores", icon: BarChart3 },
];

export default function MentorIndicators() {
  return (
    <AppShell nav={nav} user={{ name: "Dr. Marcelo Abreu", initials: "MA" }} subtitle="Painel do Mentor">
      <div className="mb-5 flex flex-col gap-4 rounded-xl border border-line-soft bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Instituição de ensino</p>
          <p className="text-base font-bold text-ink">ITA — Instituto Tecnológico de Aeronáutica</p>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <MiniStat label="Total de avaliações" value="148" />
          <MiniStat label="Tempo médio de resposta" value="2.4 dias" accent="text-approved" />
          <MiniStat label="Pendentes de análise" value={reviewQueue.length} accent="text-review" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-line-soft bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center gap-2 border-b border-line-soft pb-4">
              <TrendingUp className="h-5 w-5 text-ink" />
              <h2 className="text-base font-bold text-ink">Indicadores de Engajamento</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-line-soft bg-cloud/50 p-4">
                <div className="flex items-center gap-2 text-muted mb-2">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Alunos Ativos</span>
                </div>
                <p className="text-2xl font-bold text-ink">1.245</p>
                <p className="mt-1 text-xs text-approved">+12% neste semestre</p>
              </div>

              <div className="rounded-lg border border-line-soft bg-cloud/50 p-4">
                <div className="flex items-center gap-2 text-muted mb-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Projetos Submetidos</span>
                </div>
                <p className="text-2xl font-bold text-ink">384</p>
                <p className="mt-1 text-xs text-muted">85% aprovados</p>
              </div>

              <div className="rounded-lg border border-line-soft bg-cloud/50 p-4">
                <div className="flex items-center gap-2 text-muted mb-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Taxa de Conclusão</span>
                </div>
                <p className="text-2xl font-bold text-ink">92%</p>
                <p className="mt-1 text-xs text-muted">Média global: 78%</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-line-soft bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between border-b border-line-soft pb-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-ink" />
                <h2 className="text-base font-bold text-ink">Pesquisa Semestral com Egressos</h2>
              </div>
              <span className="rounded-full bg-approved-bg px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-approved">
                Automatizado
              </span>
            </div>
            
            <p className="mb-6 text-sm text-muted">
              Disparo automatizado configurado para ocorrer a cada seis meses com foco em mapear a empregabilidade e o impacto dos projetos no mercado de trabalho.
            </p>

            <div className="space-y-4">
              <div className="flex flex-col justify-between rounded-lg border border-line-soft p-4 sm:flex-row sm:items-center">
                <div>
                  <h4 className="text-sm font-semibold text-ink">Ciclo 2023.2</h4>
                  <p className="text-xs text-muted">Enviado em 15 de Dezembro, 2023</p>
                </div>
                <div className="mt-3 flex gap-4 sm:mt-0">
                  <div className="text-right">
                    <p className="text-lg font-bold text-ink">850</p>
                    <p className="text-[10px] uppercase text-muted">Enviados</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-approved">68%</p>
                    <p className="text-[10px] uppercase text-muted">Respostas</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue">94%</p>
                    <p className="text-[10px] uppercase text-muted">Empregados</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-lg border border-line-soft p-4 sm:flex-row sm:items-center opacity-60">
                <div>
                  <h4 className="text-sm font-semibold text-ink">Ciclo 2023.1</h4>
                  <p className="text-xs text-muted">Enviado em 15 de Junho, 2023</p>
                </div>
                <div className="mt-3 flex gap-4 sm:mt-0">
                  <div className="text-right">
                    <p className="text-lg font-bold text-ink">790</p>
                    <p className="text-[10px] uppercase text-muted">Enviados</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-approved">72%</p>
                    <p className="text-[10px] uppercase text-muted">Respostas</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue">91%</p>
                    <p className="text-[10px] uppercase text-muted">Empregados</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-xl border border-line-soft bg-white p-5 shadow-card">
            <h3 className="text-sm font-bold text-ink">Histórico de Avaliação</h3>
            <div className="mt-3 space-y-3">
              {reviewHistory.map((h, i) => (
                <div key={i} className="flex items-start justify-between gap-2 border-b border-line-soft pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-xs font-medium text-ink">{h.student}</p>
                    <p className="text-xs text-muted">{h.title}</p>
                    <p className="text-[11px] text-muted">Validado em {h.date}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    h.result === "approved" ? "bg-approved-bg text-approved" : "bg-review-bg text-review"
                  }`}>
                    {h.result === "approved" ? "Aprovado" : "Ajustes solicitados"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-line-soft bg-graphite p-5 text-white shadow-card">
            <h3 className="text-sm font-bold">Diretrizes do Estatuto Digital</h3>
            <p className="mt-2 text-xs leading-relaxed text-white/70">
              As aprovações inserem o projeto diretamente no feed público global da universidade,
              liberando a visualização a empresas parceiras. Revise com critério científico.
            </p>
            <button className="mt-3 text-xs font-semibold text-blue-50 underline underline-offset-2">
              Ler regulamento interno
            </button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <div>
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`font-mono-num text-lg font-bold ${accent || "text-ink"}`}>{value}</p>
    </div>
  );
}