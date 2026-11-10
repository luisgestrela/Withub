import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "./config.js";

const jwks = createRemoteJWKSet(new URL(config.jwksUrl), { cooldownDuration: 30_000 });

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Faça login para continuar." });
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${config.supabaseUrl}/auth/v1`,
      audience: "authenticated",
    });
    req.user = { id: payload.sub, email: payload.email, token };
    next();
  } catch {
    res.status(401).json({ error: "Sessão inválida ou expirada." });
  }
}
