import { supabase } from "./supabase.js";

const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const backendEnabled = !!base;

// Chama o backend com o token do Supabase. Retorna null se o backend não está
// configurado ou falhou (ex.: serviço "acordando" no plano gratuito do Render),
// para o chamador cair no acesso direto ao Supabase.
export async function backendGet(path, { timeoutMs = 8000 } = {}) {
  if (!base) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const res = await fetch(base + path, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status === 404) return { notFound: true };
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
