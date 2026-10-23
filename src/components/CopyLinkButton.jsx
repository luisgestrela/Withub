import { useState } from "react";
import { Link2, Check } from "lucide-react";

export const projectUrl = (id) => `${window.location.origin}/publicacao/${id}`;

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { /* ignora */ }
    ta.remove();
    return ok;
  }
}

export default function CopyLinkButton({ id, label = "Copiar link", className = "", compact = false }) {
  const [state, setState] = useState("idle");
  const onClick = async (e) => {
    e.preventDefault(); e.stopPropagation();
    setState((await copy(projectUrl(id))) ? "ok" : "err");
    setTimeout(() => setState("idle"), 2200);
  };
  const Icon = state === "ok" ? Check : Link2;
  return (
    <button type="button" onClick={onClick} aria-live="polite" title="Copiar o link do projeto para compartilhar"
      className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition ${state === "ok" ? "border-approved/40 bg-approved-bg text-approved" : "border-line text-ink hover:border-blue hover:text-blue"} ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {state === "ok" ? "Link copiado!" : state === "err" ? "Não foi possível copiar" : compact ? "Link" : label}
    </button>
  );
}
