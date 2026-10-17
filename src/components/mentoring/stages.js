import { STAGE_LABEL } from "../../services/api";

export const TAB_KEYS = ["awaiting", "mentoring", "adjustments", "approved", "published", "completed"];
export const TABS = TAB_KEYS.map((key) => ({ key, label: STAGE_LABEL[key] }));
export const STAGE_STYLE = {
  awaiting: "bg-review-bg text-review",
  mentoring: "bg-blue-50 text-blue",
  adjustments: "bg-violet-50 text-violet",
  approved: "bg-approved-bg text-approved",
  published: "bg-approved-bg text-approved",
  completed: "bg-draft-bg text-draft",
};
export const MEMBER_STYLE = {
  requested: "bg-review-bg text-review",
  accepted: "bg-blue-50 text-blue",
  active: "bg-approved-bg text-approved",
  ended: "bg-draft-bg text-draft",
  declined: "bg-red-50 text-red-700",
};
export const stageKeyOf = (stage, visibility) => (stage === "approved" && visibility === "public" ? "published" : stage);
export const fmtDate = (t) => new Date(t).toLocaleDateString("pt-BR");
export const fmtDateTime = (t) => new Date(t).toLocaleString("pt-BR");
export const fmtDuration = (ms) => {
  if (ms === null || ms === undefined) return "—";
  const hours = ms / 36e5;
  if (hours < 1) return `${Math.max(1, Math.round(ms / 6e4))} min`;
  if (hours < 48) return `${hours.toFixed(1).replace(".", ",")} h`;
  return `${(hours / 24).toFixed(1).replace(".", ",")} dias`;
};
