import { useApi } from "../services/useApi";
import { USERS, ROLE_LABEL, login, resetDemo } from "../services/api";

// Ferramenta de desenvolvimento: aparece só depois de abrir qualquer página com ?demo na URL.
const hasLS = typeof localStorage !== "undefined";
if (hasLS && new URLSearchParams(window.location.search).has("demo")) localStorage.setItem("withub-demo", "1");

export default function DemoBar() {
  const { user } = useApi();
  if (!hasLS || !localStorage.getItem("withub-demo")) return null;
  return (
    <div className="fixed bottom-4 left-4 z-50 flex max-w-[60vw] flex-wrap items-center gap-2 rounded-lg border border-dashed border-line bg-white/95 px-3 py-2 text-xs text-muted shadow-card">
      <label htmlFor="demo-user" className="font-semibold">Demo:</label>
      <select id="demo-user" value={user.id} onChange={(e) => login(e.target.value)} className="rounded-md border border-line bg-white px-2 py-1 text-xs text-ink">
        {USERS.map((u) => <option key={u.id} value={u.id}>{u.name} — {ROLE_LABEL[u.role]}</option>)}
      </select>
      <button onClick={() => window.confirm("Restaurar os dados de demonstração?") && resetDemo()} className="hover:text-blue">Restaurar</button>
      <button onClick={() => { localStorage.removeItem("withub-demo"); window.location.reload(); }} className="hover:text-blue">Ocultar</button>
    </div>
  );
}
