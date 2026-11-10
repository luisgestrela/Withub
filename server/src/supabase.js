import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

const options = { auth: { persistSession: false, autoRefreshToken: false } };

// Cliente administrativo: ignora RLS. Use só depois de checar permissão por outro caminho.
export const admin = createClient(config.supabaseUrl, config.secretKey, options);

// Cliente "como o usuário": repassa o JWT, então as políticas RLS continuam valendo.
export const forUser = (token) =>
  createClient(config.supabaseUrl, config.publishableKey, {
    ...options,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
