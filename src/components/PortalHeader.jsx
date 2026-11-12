import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Bell, ChevronDown, FolderGit2, GraduationCap, LogOut, Presentation, Search, User } from "lucide-react";
import Logo from "./Logo";
import Avatar from "./Avatar";
import { homeFor, logout, unreadNotificationCount } from "../services/api";

export default function PortalHeader({ user }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [unread, setUnread] = useState(0);
  useEffect(() => { unreadNotificationCount().then(setUnread).catch(() => setUnread(0)); }, [user.id]);
  const mentor = user.role === "mentor";
  
  const search = (e) => { e.preventDefault(); navigate(q.trim() ? `/feed?q=${encodeURIComponent(q.trim())}` : "/feed"); };

 
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const exit = () => {
    setOpen(false);
    logout().finally(() => navigate("/", { replace: true }));
  };

  return (
    <header className="sticky top-0 z-40 bg-[#003C5F] shadow-raised">
      <div className="h-1 bg-[#002E49]" />
      <div className="relative mx-auto flex h-16 w-full items-center gap-3 px-4 sm:gap-5 sm:px-6 lg:px-10 xl:px-12">
        <Link to={homeFor(user.role)} className="flex shrink-0 items-center gap-3">
          <Logo mark={false} light />
          {mentor ? <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white" title="Área do mentor" aria-label="Área do mentor"><Presentation className="h-4 w-4" /></span> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white" title="Área do estudante" aria-label="Área do estudante"><GraduationCap className="h-4 w-4" /></span>}
        </Link>
        <form onSubmit={search} role="search" className="absolute left-1/2 top-1/2 hidden w-[min(52vw,720px)] -translate-x-1/2 -translate-y-1/2 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar projetos e tecnologias…" aria-label="Buscar no feed" className={`w-full rounded-lg border border-line bg-cloud py-2 pl-9 pr-3 text-sm placeholder:text-muted focus:border-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-50 ${mentor ? "text-center" : ""}`} />
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <Link to={mentor ? "/mentor/notificacoes" : "/aluno/notificacoes"} aria-label={unread ? `Notificações (${unread} não lidas)` : "Notificações"} className="relative rounded-md p-2 text-white/85 hover:bg-white/10 hover:text-white">
            <Bell className="h-5 w-5" />
            {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet px-1 text-[10px] font-bold text-white">{unread}</span>}
          </Link>

          <div className="relative" ref={box}>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
              className="flex items-center gap-2.5 rounded-lg p-1 pr-2 transition hover:bg-white/10"
            >
              <Avatar person={user} size="md" />
              <span className="hidden max-w-[11rem] text-left sm:block">
                <span className="block truncate text-sm font-semibold leading-tight text-white">{user.name}</span>
                <span className="block text-xs leading-tight text-white/70">{mentor ? "Mentor" : "Estudante"}</span>
              </span>
              <ChevronDown className={`h-4 w-4 text-white/75 transition ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
              <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-line-soft bg-white shadow-raised">
                <div className="border-b border-line-soft bg-cloud px-4 py-3">
                  <p className="truncate text-sm font-bold text-ink">{user.name}</p>
                  {user.email && <p className="truncate text-xs text-muted">{user.email}</p>}
                  {user.institution && <p className="mt-0.5 truncate text-xs text-muted">{user.institution}</p>}
                </div>
                {mentor && (
                  <Link to={`/mentores/${user.id}`} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-cloud">
                    <User className="h-4 w-4 text-muted" /> Meu perfil
                  </Link>
                )}
                <Link to={mentor ? "/mentor/projetos" : "/aluno/projetos"} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-cloud">
                  <FolderGit2 className="h-4 w-4 text-muted" /> Meus projetos
                </Link>
                <button role="menuitem" onClick={exit} className="flex w-full items-center gap-2.5 border-t border-line-soft px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> Sair da conta
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
