import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useApi } from "../services/useApi";
import { myStats } from "../services/api";

export default function WelcomeBanner() {
  const { user } = useApi();
  if (user.role !== "student") return null;
  const s = myStats();
  return (
    <section className="mb-6 overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white shadow-raised sm:p-7">
      <p className="text-xs font-bold uppercase tracking-widest text-white/80">Portal do Estudante</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Olá, {user.name.split(" ")[0]}! O que você construiu hoje?</h1>
      <p className="mt-1 max-w-xl text-sm text-white/85">Publique seus projetos, mostre suas skills e acompanhe o que a comunidade está achando.</p>
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link to="/aluno/novo-projeto" className="inline-flex items-center gap-1.5 rounded-md bg-white px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-cloud"><Plus className="h-4 w-4" /> Publicar projeto</Link>
        <div className="flex gap-5 text-xs text-white/90">
          <span><b className="block text-xl leading-tight">{s.projects}</b>projetos</span>
          <span><b className="block text-xl leading-tight">{s.likes}</b>curtidas</span>
          <span><b className="block text-xl leading-tight">{s.comments}</b>comentários</span>
        </div>
      </div>
    </section>
  );
}
