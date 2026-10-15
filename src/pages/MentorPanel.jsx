import { useState } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard, ClipboardCheck, Compass, BarChart3, MessageSquare, Check, PenLine } from "lucide-react";
import { AppShell } from "../components/AppShell";
import CategoryChip from "../components/CategoryChip";
import { reviewQueue, reviewHistory, projects } from "../data/projects";

const nav = [
  { to: "/mentor", label: "Fila de Validação", icon: ClipboardCheck },
  { to: "/mentor/explorar", label: "Explorar Instituição", icon: Compass },
  { to: "/mentor/indicadores", label: "Indicadores", icon: BarChart3 },
];

export default function MentorPanel() {
  const [tab, setTab] = useState("queue");
  const institutionProjects = projects.filter((p) => p.institution.startsWith("ITA"));

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
        <div>
          <div className="mb-4 flex gap-1 rounded-lg border border-line-soft bg-white p-1 shadow-card w-fit">
            <TabButton active={tab === "queue"} onClick={() => setTab("queue")}>
              Meus orientandos ({reviewQueue.length})
            </TabButton>
            <TabButton active={tab === "explore"} onClick={() => setTab("explore")}>
              Explorar projetos da instituição
            </TabButton>
          </div>

          {tab === "queue" ? (
            <div className="space-y-4">
              {reviewQueue.map((item) => (
                <div key={item.id} className="rounded-xl border border-line-soft bg-white p-5 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-gradient text-[9px] font-bold text-white">
                          {item.student.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </span>
                        {item.student} · enviado em {item.submitted}
                      </div>
                      <h3 className="mt-1.5 text-sm font-semibold text-ink">{item.title}</h3>
                      <div className="mt-2"><CategoryChip id={item.category} /></div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
                    <Link to={`/projeto/${item.id}`} className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-blue hover:text-blue">
                      Visualizar repositório ↗
                    </Link>
                    <button className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-blue hover:text-blue">
                      Relatório técnico ↗
                    </button>
                    <div className="ml-auto flex gap-2">
                      <button className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-cloud">
                        <MessageSquare className="h-3.5 w-3.5" /> Comentar
                      </button>
                      <button className="inline-flex items-center gap-1.5 rounded-md border border-review bg-review-bg px-3 py-1.5 text-xs font-semibold text-review hover:brightness-95">
                        <PenLine className="h-3.5 w-3.5" /> Ajustes
                      </button>
                      <button className="inline-flex items-center gap-1.5 rounded-md bg-approved px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110">
                        <Check className="h-3.5 w-3.5" /> Aprovar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {institutionProjects.map((p) => (
                <Link key={p.id} to={`/projeto/${p.id}`} className="rounded-xl border border-line-soft bg-white p-4 shadow-card hover:border-blue">
                  <CategoryChip id={p.category} />
                  <h3 className="mt-2 text-sm font-semibold text-ink">{p.title}</h3>
                  <p className="mt-1 text-xs text-muted">{p.status === "approved" ? "Aprovado" : "Pendente"}</p>
                </Link>
              ))}
            </div>
          )}
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

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3.5 py-2 text-xs font-semibold transition ${
        active ? "bg-ink text-white" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
