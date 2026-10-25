import { Link, useLocation } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import Logo from "./Logo";
import PortalHeader from "./PortalHeader";
import Avatar from "./Avatar";
import { unreadNotificationCount, unreadTotal } from "../services/api";

export function AppShell({ nav, user, subtitle, children }) {
  const location = useLocation();
  const student = user.role === "student";
  const mentor = user.role === "mentor";
  const portal = student || mentor;
  const badges = mentor ? { messages: unreadTotal(), notifications: unreadNotificationCount() } : {};
  return (
    <div className={`min-h-screen ${portal ? "bg-[linear-gradient(180deg,#EDF3FF_0,#F6F7F9_280px)]" : "bg-cloud"}`}>
      {portal && <PortalHeader user={user} />}
      {!portal && <header className="sticky top-0 z-40 border-b border-line-soft bg-white">
        <div className="mx-auto flex h-16 max-w-content items-center gap-4 px-4 sm:px-5 lg:gap-6 lg:px-6">
          <Link to="/"><Logo /></Link>
          <div className="relative hidden flex-1 max-w-sm md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar projetos, mentores ou tecnologias…"
              className="w-full rounded-lg border border-line bg-cloud py-2 pl-9 pr-3 text-sm placeholder:text-muted focus:border-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-50"
            />
          </div>
          <div className="ml-auto flex items-center gap-4">
            <button className="relative rounded-md p-2 text-muted hover:bg-cloud hover:text-ink">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet ring-2 ring-white" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">
                {user.initials}
              </span>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-tight text-ink">{user.name}</p>
                <p className="text-xs leading-tight text-muted">{subtitle}</p>
              </div>
            </div>
          </div>
        </div>
      </header>}

      <div className="mx-auto max-w-content px-4 py-5 sm:px-5 sm:py-6 lg:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[208px_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[232px_minmax(0,1fr)]">
          <aside className="min-w-0 space-y-3 lg:sticky lg:top-24 lg:self-start">
            {student && (
              <div className="shell-profile hidden overflow-hidden rounded-xl bg-brand-gradient p-4 text-white shadow-raised lg:block">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-base font-bold ring-2 ring-white/40">{user.initials}</span>
                <p className="mt-3 text-sm font-bold leading-tight">{user.name}</p>
                {user.institution && <p className="mt-0.5 text-xs text-white/80">{user.institution}</p>}
                <span className="mt-3 inline-flex rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">
                  Estudante{user.course ? ` · ${user.course}` : ""}
                </span>
              </div>
            )}
            {mentor && (
              <div className="shell-profile hidden overflow-hidden rounded-xl bg-brand-gradient p-4 text-white shadow-raised lg:block">
                <Avatar person={user} size="lg" className="ring-2 ring-white/40" />
                <p className="mt-3 text-sm font-bold leading-tight">{user.name}</p>
                {user.institution && <p className="mt-0.5 text-xs text-white/80">{user.institution}</p>}
                <span className="mt-3 inline-flex rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">Mentor</span>
              </div>
            )}
            <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {nav.map((item) => {
              const active = location.pathname === item.to || (item.to !== "/mentor" && item.to !== "/feed" && location.pathname.startsWith(`${item.to}/`));
              const Icon = item.icon;
              const count = item.badge ? badges[item.badge] : 0;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition ${
                    student ? "border-l-4" : ""
                  } ${active ? (student ? "border-blue bg-white font-semibold text-blue shadow-card" : "bg-blue-50 text-blue") : `${student ? "border-transparent " : ""}text-muted hover:bg-white hover:text-ink`}`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {count > 0 && <span className="ml-auto rounded-full bg-violet px-1.5 py-0.5 text-[10px] font-bold text-white" aria-label={`${count} não lidas`}>{count}</span>}
                </Link>
              );
            })}
            </nav>
          </aside>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}

