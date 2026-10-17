import Avatar from "../Avatar";
import { STAGE_LABEL } from "../../services/api";
import { fmtDateTime } from "./stages";

export default function HistoryList({ entries }) {
  if (!entries.length) return <p className="text-sm text-muted">Ainda não há registros de acompanhamento.</p>;
  return (
    <ol className="space-y-4">
      {entries.map((e) => (
        <li key={e.id} className="flex gap-3">
          <Avatar person={{ initials: e.authorInitials, photo: "" }} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink">{e.summary}</p>
            {e.from && e.to && <p className="text-xs text-muted">{STAGE_LABEL[e.from] || e.from} → {STAGE_LABEL[e.to] || e.to}</p>}
            {e.text && <p className="mt-1 whitespace-pre-line rounded-lg bg-cloud px-3 py-2 text-sm text-ink">{e.text}</p>}
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>{e.authorName} · {fmtDateTime(e.at)}</span>
              {e.visibility === "mentors" && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet">Privado: só mentores</span>}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}