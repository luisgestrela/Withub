import { useApi } from "../../services/useApi";
import * as api from "../../services/api";
import MentorTeam from "./MentorTeam";
import ReviewPanel from "./ReviewPanel";
import OwnerPanel from "./OwnerPanel";
import Meetings from "./Meetings";
import HistoryList from "./HistoryList";

export default function MentoringSection({ post, act }) {
  const { user } = useApi();
  const mentoring = api.getMentoringState(post.id);
  const owner = post.perms.owner && user.role === "student";
  const history = mentoring.canHistory ? api.getHistory(post.id) : [];
  return (
    <>
      <MentorTeam post={post} mentoring={mentoring} act={act} />
      {mentoring.mine && <ReviewPanel post={post} mentoring={mentoring} act={act} />}
      {owner && <OwnerPanel post={post} mentoring={mentoring} act={act} />}
      {mentoring.canHistory && <Meetings post={post} mentoring={mentoring} act={act} />}
      {mentoring.canHistory && (
        <section className="rounded-xl border border-line-soft bg-white p-5 shadow-card" aria-labelledby="hist-title">
          <h2 id="hist-title" className="mb-3 text-sm font-bold text-ink">Histórico de acompanhamento</h2>
          <HistoryList entries={history} />
        </section>
      )}
    </>
  );
}
