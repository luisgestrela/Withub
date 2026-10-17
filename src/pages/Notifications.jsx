import { Link } from "react-router-dom";
import { Bell, Calendar, CircleCheck, ClipboardCheck, FileText, MessageCircle, MessageSquare, Repeat2 } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { mentorNavFor, studentNav } from "../components/navs";
import { useApi } from "../services/useApi";
import { markNotificationsRead, myNotifications } from "../services/api";

const ICON = { comment: MessageCircle, repost: Repeat2, request: ClipboardCheck, decision: CircleCheck, feedback: MessageCircle, status: CircleCheck, update: FileText, meeting: Calendar, message: MessageSquare };

export default function Notifications() {
  const { user } = useApi();
  const items = myNotifications();
  const unread = items.filter((i) => !i.read).length;
  const mentor = user.role === "mentor";
  return (
    <AppShell nav={mentor ? mentorNavFor(user.id) : studentNav} user={user} subtitle={mentor ? "Mentor" : "Estudante"}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold text-ink">Notificações</h1><p className="mt-1 text-sm text-muted">{unread ? `${unread} não lidas` : "Tudo em dia."}</p></div>
        <button onClick={() => markNotificationsRead(items.map((i) => i.id))} disabled={!unread} className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-blue hover:text-blue disabled:opacity-40">Marcar todas como lidas</button>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-line-soft bg-white p-10 text-center text-sm text-muted">{mentor ? "Solicitações, mensagens e atualizações dos projetos acompanhados aparecerão aqui." : "Quando alguém comentar, repostar ou o mentor avaliar seus projetos, você verá aqui."}</p>
      ) : (
        <ul className="divide-y divide-line-soft rounded-xl border border-line-soft bg-white shadow-card">
          {items.map((i) => {
            const Icon = ICON[i.kind] || Bell;
            const isNew = !i.read;
            return (
              <li key={i.id}>
                <Link to={i.to || "/feed"} onClick={() => markNotificationsRead([i.id])} className={`flex items-start gap-3 px-5 py-4 hover:bg-cloud ${isNew ? "bg-blue-50/40" : ""}`}>
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-blue" />
                  <span className="min-w-0 flex-1"><span className="block text-sm text-ink">{i.text}</span><span className="mt-1 block text-xs text-muted">{new Date(i.at).toLocaleString("pt-BR")}</span></span>
                  {isNew && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet" aria-label="Não lida" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}

