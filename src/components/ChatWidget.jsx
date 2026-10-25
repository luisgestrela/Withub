import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquare, X } from "lucide-react";
import ChatPanel from "./ChatPanel";
import { useApi } from "../services/useApi";
import { unreadTotal } from "../services/api";

export default function ChatWidget() {
  const { user } = useApi();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  if (user.role !== "mentor" || pathname.startsWith("/mentor/chat")) return null;
  const unread = unreadTotal();
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw_-_2rem)] flex flex-col items-end gap-3">
      {open && (
        <div className="w-[min(94vw,760px)] overflow-hidden rounded-xl bg-white shadow-raised">
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-2">
            <p className="text-sm font-bold text-ink">Chat dos mentores</p>
            <button onClick={() => setOpen(false)} aria-label="Fechar chat" className="rounded p-1 text-muted hover:bg-cloud"><X className="h-4 w-4" /></button>
          </div>
          <ChatPanel className="h-[clamp(320px,calc(100dvh_-_11rem),34rem)]" />
        </div>
      )}
      <button onClick={() => setOpen((v) => !v)} aria-label="Abrir chat dos mentores" aria-expanded={open}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient text-white shadow-raised transition hover:brightness-110">
        <MessageSquare className="h-6 w-6" />
        {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold">{unread}</span>}
      </button>
    </div>
  );
}

