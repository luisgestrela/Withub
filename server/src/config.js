const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
};

const supabaseUrl = required("SUPABASE_URL").replace(/\/$/, "");

export const config = {
  port: Number(process.env.PORT) || 3000,
  supabaseUrl,
  publishableKey: required("SUPABASE_PUBLISHABLE_KEY"),
  secretKey: required("SUPABASE_SECRET_KEY"),
  jwksUrl: process.env.SUPABASE_JWKS_URL || `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",").map((origin) => origin.trim().replace(/\/$/, "")).filter(Boolean),
  feedTtlMs: Number(process.env.FEED_CACHE_TTL_MS) || 30_000,
  mentorsTtlMs: Number(process.env.MENTORS_CACHE_TTL_MS) || 60_000,
};
