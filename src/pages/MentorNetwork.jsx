import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageSquare, Search } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { mentorNavFor } from "../components/navs";
import Avatar from "../components/Avatar";
import Notice from "../components/Notice";
import { useApi } from "../services/useApi";
import { listMentors, startDirectChat } from "../services/api";

export default function MentorNetwork() {
  const { user } = useApi();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [notice, setNotice] = useState(null);
  const mentors = listMentors(q).filter((m) => !m.isMe);
  const chat = (id) => {
    try { navigate(`/mentor/chat/${startDirectChat(id)}`); } catch (e) { setNotice({ type: "err", text: e.message }); }
  };
  return (
    <AppShell nav={mentorNavFor(user.id)} user={user} subtitle="Mentor">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink">Conexões</h1>
        <p className="mt-1 text-sm text-muted">Encontre outros mentores por nome, especialidade, instituição ou área de atuação e inicie uma conversa.</p>
      </div>
      <Notice notice={notice} />
      <div className="relative mb-5 max-w-lg">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar mentores…" aria-label="Buscar mentores" className="w-full rounded-lg border border-line bg-white py-2.5 pl-9 pr-3 text-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue" />
      </div>
      {mentors.length === 0 ? (
        <p className="rounded-xl border border-line-soft bg-white p-8 text-center text-sm text-muted">{q ? "Nenhum mentor encontrado para essa busca." : "Ainda não há outros mentores cadastrados."}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mentors.map((m) => (
            <article key={m.id} className="flex flex-col rounded-xl border border-line-soft bg-white p-4 shadow-card">
              <div className="flex items-start gap-3">
                <Avatar person={m} size="lg" />
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-ink">{m.name}</h2>
                  <p className="text-xs text-muted">{m.position}</p>
                  <p className="text-xs text-muted">{m.institution}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {m.specialties.slice(0, 4).map((s) => <span key={s} className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue">{s}</span>)}
              </div>
              <div className="mt-auto flex gap-2 pt-4">
                <Link to={`/mentores/${m.id}`} className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-blue hover:text-blue">Ver perfil</Link>
                <button onClick={() => chat(m.id)} className="inline-flex items-center gap-1.5 rounded-md bg-brand-gradient px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"><MessageSquare className="h-3.5 w-3.5" /> Conversar</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
