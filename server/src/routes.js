import { Router } from "express";
import { requireAuth } from "./auth.js";
import { admin, forUser } from "./supabase.js";
import { createCache } from "./cache.js";
import { config } from "./config.js";

const unwrap = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const feedCache = createCache(config.feedTtlMs);
const mentorsCache = createCache(config.mentorsTtlMs);
const MENTOR_COLUMNS = "id,full_name,institution,avatar_path,position,specialties,steam_areas,bio,education,experience,links";

// Parte compartilhada do feed: só projetos públicos, igual para todo mundo.
async function loadPublicFeed() {
  const rows = unwrap(await admin.from("project_feed").select("*").eq("visibility", "public").order("published_at", { ascending: false }));
  const ids = rows.map((row) => row.id);
  if (!ids.length) return { rows, teams: [], images: {}, likes: [], reposts: [] };
  const [teams, imageRows, likes, reposts] = await Promise.all([
    admin.from("project_team").select("project_id,mentor_id,mentor_name,status,role").in("project_id", ids),
    admin.from("project_images").select("project_id,storage_path,sort_order").in("project_id", ids).order("sort_order"),
    admin.from("project_likes").select("project_id,user_id").in("project_id", ids),
    admin.from("project_reposts").select("project_id,user_id,created_at").in("project_id", ids),
  ]);
  const paths = unwrap(imageRows);
  // Uma única chamada para assinar todas as imagens (antes eram N chamadas).
  const signed = paths.length
    ? unwrap(await admin.storage.from("withub-project-media").createSignedUrls(paths.map((p) => p.storage_path), 3600))
    : [];
  const urlByPath = new Map(signed.map((item) => [item.path, item.signedUrl]));
  const images = {};
  for (const item of paths) {
    (images[item.project_id] ||= [])[item.sort_order] = urlByPath.get(item.storage_path) || null;
  }
  return { rows, teams: unwrap(teams), images, likes: unwrap(likes), reposts: unwrap(reposts) };
}

export const router = Router();

router.get("/health", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

router.get("/api/feed", requireAuth, asyncRoute(async (req, res) => {
  if (req.query.fresh === "1") feedCache.clear();
  const data = await feedCache.get(loadPublicFeed);
  res.set("Cache-Control", req.query.fresh === "1" ? "no-store" : "private, max-age=15");
  res.json(data);
}));

router.get("/api/mentors", requireAuth, asyncRoute(async (_req, res) => {
  const rows = await mentorsCache.get(async () =>
    unwrap(await admin.from("mentor_directory").select(MENTOR_COLUMNS).order("full_name")));
  res.set("Cache-Control", "private, max-age=30");
  res.json(rows);
}));

// Download de arquivo restrito: a permissão é checada com o JWT do usuário (RLS);
// só depois a chave administrativa assina a URL.
router.get("/api/projects/:projectId/files/:fileId/download", requireAuth, asyncRoute(async (req, res) => {
  const { projectId, fileId } = req.params;
  const asUser = forUser(req.user.token);
  const { data: file, error } = await asUser.from("project_restricted_files")
    .select("storage_path,original_name").eq("project_id", projectId).eq("id", fileId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!file) return res.status(404).json({ error: "Arquivo não encontrado ou sem permissão." });
  const { data, error: signError } = await admin.storage.from("withub-project-files").createSignedUrl(file.storage_path, 120);
  if (signError) throw new Error(signError.message);
  res.set("Cache-Control", "no-store");
  res.json({ name: file.original_name, url: data.signedUrl });
}));
