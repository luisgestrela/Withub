import { Link } from "react-router-dom";
import { ShieldCheck, Users } from "lucide-react";
import CategoryChip from "./CategoryChip";

export default function ProjectCard({ project }) {
  return (
    <Link
      to={`/projeto/${project.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line-soft bg-white shadow-card transition hover:-translate-y-0.5 hover:border-line hover:shadow-raised"
    >
      <div className={`relative h-32 bg-gradient-to-br ${project.cover}`}>
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:16px_16px]" />
        <div className="absolute right-3 top-3">
          <CategoryChip id={project.category} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink group-hover:text-blue">
            {project.title}
          </h3>
          <p className="mt-1 text-xs text-muted">{project.institution}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {project.stack.slice(0, 3).map((t) => (
            <span key={t} className="rounded border border-line-soft bg-cloud px-1.5 py-0.5 font-mono-num text-[11px] text-muted">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-line-soft pt-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {project.team.length}
          </span>
          {project.status === "approved" ? (
            <span className="inline-flex items-center gap-1 font-medium text-approved">
              <ShieldCheck className="h-3.5 w-3.5" /> Validado
            </span>
          ) : (
            <span className="text-review">Em revisão</span>
          )}
        </div>
      </div>
    </Link>
  );
}
