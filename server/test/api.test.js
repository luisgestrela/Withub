import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { generateKeyPair, exportJWK, SignJWT } from "jose";

let jwksServer, api, base, privateKey;
const SUPA = "http://127.0.0.1:9"; // porta fechada: nenhuma chamada real ao Supabase

before(async () => {
  const pair = await generateKeyPair("ES256");
  privateKey = pair.privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "ES256", use: "sig" };
  jwksServer = http.createServer((_req, res) => res.end(JSON.stringify({ keys: [jwk] })));
  await new Promise((r) => jwksServer.listen(0, r));
  Object.assign(process.env, {
    SUPABASE_URL: SUPA, SUPABASE_PUBLISHABLE_KEY: "pub", SUPABASE_SECRET_KEY: "sec",
    SUPABASE_JWKS_URL: `http://127.0.0.1:${jwksServer.address().port}`,
    ALLOWED_ORIGINS: "https://withub.onrender.com",
  });
  const { createApp } = await import("../src/app.js");
  api = createApp().listen(0);
  await new Promise((r) => api.once("listening", r));
  base = `http://127.0.0.1:${api.address().port}`;
});
after(() => { api.close(); jwksServer.close(); });

const token = (claims = {}) => new SignJWT({ email: "a@b.c", ...claims })
  .setProtectedHeader({ alg: "ES256", kid: "k1" }).setSubject("user-1")
  .setIssuer(`${SUPA}/auth/v1`).setAudience("authenticated").setExpirationTime("5m").sign(privateKey);

test("/health responde sem login", async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).ok, true);
});

test("rotas /api exigem token", async () => {
  for (const path of ["/api/feed", "/api/mentors", "/api/projects/p/files/f/download"])
    assert.equal((await fetch(base + path)).status, 401, path);
});

test("token inválido é recusado", async () => {
  const res = await fetch(`${base}/api/feed`, { headers: { Authorization: "Bearer abc.def.ghi" } });
  assert.equal(res.status, 401);
});

test("token com audiência errada é recusado", async () => {
  const bad = await new SignJWT({}).setProtectedHeader({ alg: "ES256", kid: "k1" }).setSubject("u")
    .setIssuer(`${SUPA}/auth/v1`).setAudience("outra").setExpirationTime("5m").sign(privateKey);
  assert.equal((await fetch(`${base}/api/feed`, { headers: { Authorization: `Bearer ${bad}` } })).status, 401);
});

test("token válido passa da autenticação (falha depois, no Supabase fake)", async () => {
  const res = await fetch(`${base}/api/feed`, { headers: { Authorization: `Bearer ${await token()}` } });
  assert.notEqual(res.status, 401);
});

test("CORS só libera origens permitidas", async () => {
  const ok = await fetch(`${base}/health`, { headers: { Origin: "https://withub.onrender.com" } });
  assert.equal(ok.headers.get("access-control-allow-origin"), "https://withub.onrender.com");
  const no = await fetch(`${base}/health`, { headers: { Origin: "https://malicioso.com" } });
  assert.equal(no.headers.get("access-control-allow-origin"), null);
});
