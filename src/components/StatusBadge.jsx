import { Check, Clock, FileEdit } from "lucide-react";

const CONFIG = {
  approved: {
    label: "Validado pelo mentor",
    bg: "bg-approved-bg",
    text: "text-approved",
    icon: Check,
  },
  review: {
    label: "Em análise do mentor",
    bg: "bg-review-bg",
    text: "text-review",
    icon: Clock,
  },
  draft: {
    label: "Rascunho",
    bg: "bg-draft-bg",
    text: "text-draft",
    icon: FileEdit,
  },
};

export default function StatusBadge({ status, label }) {
  const cfg = CONFIG[status] || CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {label || cfg.label}
    </span>
  );
}
