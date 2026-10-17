import { STAGE_LABEL } from "../services/api";
import { STAGE_STYLE, stageKeyOf } from "./mentoring/stages";

export default function StageBadge({ stage, visibility }) {
  const key = stageKeyOf(stage, visibility);
  if (!key) return null;
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STAGE_STYLE[key]}`}>{STAGE_LABEL[key]}</span>;
}
