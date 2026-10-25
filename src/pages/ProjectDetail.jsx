import { useParams, Link } from "react-router-dom";
import {
    ArrowLeft,
    Download,
    ShieldCheck,
    Users,
    Calendar,
    FileCode2,
    Image as ImageIcon,
} from "lucide-react";
import PortalHeader from "../components/PortalHeader";
import { useApi } from "../services/useApi";
import { getPost, getTeam } from "../services/api";
import Footer from "../components/Footer";
import CategoryChip from "../components/CategoryChip";
import { projects } from "../data/projects";

export default function ProjectDetail() {
    const { id } = useParams();
    const { user } = useApi();
    const project = projects.find((p) => p.id === id) || projects[0];
    let team = [];
    try { getPost(project.id); team = getTeam(project.id); } catch { team = []; }

    return (
        <div className="min-h-screen bg-white">
            <PortalHeader user={user} />

            <div className={`h-32 bg-gradient-to-br sm:h-40 ${project.cover}`} />

            <div className="mx-auto max-w-content px-4 sm:px-5 lg:px-6">
                <Link
                    to="/feed"
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-blue"
                >
                    <ArrowLeft className="h-4 w-4" /> Voltar ao feed
                </Link>

                <div className="mt-4 grid grid-cols-1 gap-8 pb-16 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <CategoryChip id={project.category} size="md" />
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-approved-bg px-2.5 py-1 text-xs font-medium text-approved">
                                <ShieldCheck className="h-3.5 w-3.5" /> Validado
                                pelo mentor
                            </span>
                        </div>
                        <h1 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-ink md:text-3xl">
                            {project.title}
                        </h1>
                        <p className="mt-2 text-sm text-muted">
                            {project.institution}
                        </p>

                        <div className="mt-8 space-y-2">
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                                Descrição técnica
                            </h2>
                            <p className="max-w-2xl text-[15px] leading-relaxed text-ink">
                                {project.summary}
                            </p>
                        </div>

                        <div className="mt-8">
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                                Stack utilizada
                            </h2>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {project.stack.map((t) => (
                                    <span
                                        key={t}
                                        className="rounded-md border border-line-soft bg-cloud px-2.5 py-1 font-mono-num text-xs text-ink"
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8">
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                                Mídia enviada
                            </h2>
                            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-line-soft bg-cloud text-muted transition-colors hover:border-blue hover:text-blue cursor-pointer">
                                    <FileCode2 className="h-6 w-6" />
                                </div>
                                {project.mediaImg && project.mediaImg.length > 0
                                    ? project.mediaImg.map((imgUrl, i) => (
                                          <a
                                              key={i}
                                              href={imgUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="group relative aspect-square overflow-hidden rounded-lg border border-line-soft bg-cloud"
                                          >
                                              <img
                                                  src={imgUrl}
                                                  alt={`${project.title} - Imagem ${i + 1}`}
                                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                              />
                                          </a>
                                      ))
                                    : Array.from({
                                          length: project.media || 1,
                                      }).map((_, i) => (
                                          <div
                                              key={i}
                                              className="flex aspect-square items-center justify-center rounded-lg border border-line-soft bg-cloud text-muted"
                                          >
                                              {i === 0 ? (
                                                  <FileCode2 className="h-6 w-6" />
                                              ) : (
                                                  <ImageIcon className="h-6 w-6" />
                                              )}
                                          </div>
                                      ))}
                            </div>
                        </div>
                    </div>

                    <aside className="space-y-5">
                        <div className="rounded-xl border border-line-soft bg-white p-5 shadow-card">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Equipe
                            </p>
                            <div className="mt-3 space-y-2">
                                {project.team.map((m) => (
                                    <div
                                        key={m}
                                        className="flex items-center gap-2 text-sm text-ink"
                                    >
                                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-gradient text-[11px] font-bold text-white">
                                            {m
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")
                                                .slice(0, 2)}
                                        </span>
                                        {m}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex items-start gap-2 border-t border-line-soft pt-4 text-sm text-muted">
                                <Users className="mt-0.5 h-4 w-4 shrink-0" />
                                {team.length > 0 ? (
                                    <span>
                                        Mentoria:{" "}
                                        {team.filter((m) => ["accepted", "active", "ended"].includes(m.status)).map((m, i) => (
                                            <span key={m.id}>{i > 0 && ", "}<Link to={`/mentores/${m.mentorId}`} className="font-medium text-ink hover:text-blue">{m.name}</Link></span>
                                        ))}
                                    </span>
                                ) : (
                                    <span>Mentor: {project.mentor}</span>
                                )}
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-sm text-muted">
                                <Calendar className="h-4 w-4" /> Validado em{" "}
                                {project.validated || "—"}
                            </div>
                        </div>

                        <div className="rounded-xl border border-line-soft bg-graphite p-5 text-white shadow-card">
                            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                                Certificado digital
                            </p>
                            <p className="mt-2 text-sm text-white/80">
                                Documento com assinatura institucional e QR de
                                verificação pública.
                            </p>
                            <div className="mt-4 flex items-center gap-3">
                                <div className="grid h-16 w-16 shrink-0 grid-cols-4 grid-rows-4 gap-0.5 rounded bg-white p-1.5">
                                    {Array.from({ length: 16 }).map((_, i) => (
                                        <span
                                            key={i}
                                            className={`rounded-[1px] ${[1, 2, 4, 6, 9, 11, 13, 14].includes(i) ? "bg-ink" : "bg-transparent"}`}
                                        />
                                    ))}
                                </div>
                                <button className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-white px-3 py-2 text-xs font-semibold text-ink hover:bg-white/90">
                                    <Download className="h-3.5 w-3.5" /> Baixar
                                    PDF
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            <Footer />
        </div>
    );
}
