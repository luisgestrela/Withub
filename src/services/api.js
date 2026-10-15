// "Servidor" simulado do protótipo. TODA regra de permissão vive aqui (nunca na UI):
// a interface só chama estas funções, e elas lançam ApiError 403/404 quando necessário.
// Para um backend real, troque cada função por uma chamada HTTP mantendo as mesmas regras.
import { projects as seedProjects } from "../data/projects.js";

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const USERS = [
  { id: "u-eduardo", name: "Eduardo Santos", initials: "ES", role: "student", email: "eduardo.santos@ita.br", institution: "ITA — Instituto Tecnológico de Aeronáutica", course: "Engenharia de Computação" },
  { id: "u-beatriz", name: "Beatriz Alves", initials: "BA", role: "viewer" },
  { id: "u-marcelo", name: "Dr. Marcelo Abreu", initials: "MA", role: "mentor" },
  { id: "u-renata", name: "Dra. Renata Costa", initials: "RC", role: "mentor" },
  { id: "u-andre", name: "Prof. André Bittencourt", initials: "AB", role: "mentor" },
];
export const ROLE_LABEL = { student: "Estudante", viewer: "Visualizador", mentor: "Mentor" };
export const STICKERS = ["👍", "🎉", "🚀", "💡", "🔧", "🧠", "👏", "🔥", "✅", "🤝", "📐", "🧪"];
export const LIMITS = {
  image: { types: ["image/jpeg", "image/png", "image/webp"], max: 2 * 1024 * 1024 },
  restricted: {
    exts: ["pdf", "zip", "step", "stp", "stl", "obj", "dwg", "dxf", "f3d", "png", "jpg", "jpeg", "docx", "xlsx", "pptx", "txt"],
    max: 10 * 1024 * 1024,
  },
};

export function validateFile(kind, file) {
  if (kind === "image") {
    if (!LIMITS.image.types.includes(file.type)) return `"${file.name}": use JPG, PNG ou WEBP.`;
    if (file.size > LIMITS.image.max) return `"${file.name}" excede 2 MB.`;
    return null;
  }
  const ext = file.name.split(".").pop().toLowerCase();
  if (!LIMITS.restricted.exts.includes(ext)) return `"${file.name}": formato .${ext} não permitido.`;
  if (file.size > LIMITS.restricted.max) return `"${file.name}" excede 10 MB.`;
  return null;
}
export const parseList = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 20);

/* ---------- estado ---------- */
const KEY = "withub-mock-v1";
const SESSION = "withub-mock-session";
const fileStore = new Map(); // conteúdo dos arquivos restritos (somente na sessão)
const hasLS = typeof localStorage !== "undefined";

function seed() {
  const now = Date.now(), DAY = 864e5;
  const posts = seedProjects.filter((p) => p.visibility === "public").map((p, i) => ({
    id: p.id, ownerId: p.id === "rover-lidar" ? "u-eduardo" : `ext-${p.id}`, authorName: p.team[0],
    title: p.title, description: p.summary, category: p.category, cover: p.cover, images: p.mediaImg || [],
    skills: [], knowledge: [], tech: p.stack, visibility: "public", createdAt: now - (i + 1) * DAY, grants: {},
  }));
  return {
    posts,
    restricted: {
      "rover-lidar": [
        { id: "f-seed1", name: "modelagem-chassi.step", size: 4200000, uploadedAt: now - DAY },
        { id: "f-seed2", name: "desenho-tecnico-v3.pdf", size: 1800000, uploadedAt: now - DAY },
      ],
    },
    likes: { "rover-lidar": ["u-beatriz"] },
    comments: [{ id: "c1", projectId: "rover-lidar", userId: "u-beatriz", text: "Projeto incrível! Parabéns pelo mapeamento.", at: now - 3600e3 }],
    reposts: [],
    conversations: [
      { id: "g1", type: "group", name: "Mentores Withub", members: ["u-marcelo", "u-renata", "u-andre"] },
      { id: "d1", type: "direct", name: "", members: ["u-marcelo", "u-renata"] },
    ],
    messages: [
      { id: "m1", convId: "g1", senderId: "u-andre", kind: "text", body: "Bem-vindos ao canal dos mentores!", at: now - 7200e3 },
      { id: "m2", convId: "g1", senderId: "u-renata", kind: "sticker", body: "👏", at: now - 7100e3 },
      { id: "m3", convId: "d1", senderId: "u-renata", kind: "text", body: "Marcelo, você viu os arquivos técnicos do rover?", at: now - 1800e3 },
    ],
    reads: {},
    users: [],
    mentorRequests: [],
    notifReads: {},
  };
}
function load() {
  try { const raw = hasLS && localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch { /* ignora */ }
  return seed();
}
let state = load();
state.users = state.users || [];
state.mentorRequests = state.mentorRequests || [];
state.notifReads = state.notifReads || {};
const allUsers = () => [...USERS, ...state.users];
let currentId = (hasLS && localStorage.getItem(SESSION)) || null;
let version = 0;
const subs = new Set();
function commit() {
  version++;
  try { hasLS && localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* cota cheia: segue em memória */ }
  subs.forEach((f) => f());
}
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
export const getVersion = () => version;
export function resetDemo() { const { users, mentorRequests } = state; state = seed(); state.users = users; state.mentorRequests = mentorRequests; fileStore.clear(); commit(); }

/* ---------- sessão ---------- */
// Simula o login. Não existe nenhuma função para o usuário alterar a própria função (role).
export const me = () => allUsers().find((u) => u.id === currentId) || USERS[0];
export const isLoggedIn = () => !!currentId && allUsers().some((u) => u.id === currentId);
export function login(id) {
  if (!allUsers().some((u) => u.id === id)) throw new ApiError(400, "Usuário inválido.");
  currentId = id;
  try { hasLS && localStorage.setItem(SESSION, id); } catch { /* ignora */ }
  commit();
}
const userName = (id) => allUsers().find((u) => u.id === id)?.name || "Usuário";

// Cadastro de estudantes. A senha é apenas validada: o protótipo nunca a armazena.
export const INSTITUTIONS = ["ITA — Instituto Tecnológico de Aeronáutica", "USP — Universidade de São Paulo", "UNICAMP", "UFMG", "Outra instituição"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function registerStudent({ name, email, institution, course, password }) {
  const n = String(name || "").trim().replace(/\s+/g, " ");
  const e = String(email || "").trim().toLowerCase();
  if (n.split(" ").length < 2) throw new ApiError(400, "Informe seu nome completo.");
  if (!EMAIL.test(e)) throw new ApiError(400, "Informe um e-mail válido.");
  if (!INSTITUTIONS.includes(institution)) throw new ApiError(400, "Selecione sua instituição.");
  if (String(password || "").length < 8) throw new ApiError(400, "A senha precisa ter pelo menos 8 caracteres.");
  if (allUsers().some((u) => u.email === e)) throw new ApiError(409, "Já existe um cadastro com este e-mail.");
  const user = {
    id: `u-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: n, email: e, role: "student", institution,
    course: String(course || "").trim(), initials: n.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join(""),
  };
  state.users.push(user); // a função é sempre "student": nunca vem do formulário
  login(user.id);
  return user.id;
}
// Cadastro de mentores: mentores enxergam arquivos confidenciais de todos os projetos, então o
// cadastro NUNCA concede acesso na hora. Ele registra uma solicitação pendente (sem sessão e sem
// função "mentor"); a liberação do acesso é decisão da instituição, fora desta tela.
export function requestMentorAccess({ name, email, institution, area }) {
  const n = String(name || "").trim().replace(/\s+/g, " ");
  const e = String(email || "").trim().toLowerCase();
  if (n.split(" ").length < 2) throw new ApiError(400, "Informe seu nome completo.");
  if (!EMAIL.test(e)) throw new ApiError(400, "Informe um e-mail válido.");
  if (!INSTITUTIONS.includes(institution)) throw new ApiError(400, "Selecione sua instituição.");
  if (state.mentorRequests.some((r) => r.email === e)) throw new ApiError(409, "Já existe uma solicitação de cadastro com este e-mail.");
  if (allUsers().some((u) => u.email === e)) throw new ApiError(409, "Este e-mail já possui um cadastro na plataforma.");
  const req = { id: `mr-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: n, email: e, institution, area: String(area || "").trim().slice(0, 120), status: "pending", createdAt: Date.now() };
  state.mentorRequests.push(req);
  commit();
  return req.id;
}
export function signIn({ email, password }) {
  const e = String(email || "").trim().toLowerCase();
  const u = allUsers().find((x) => x.email === e && x.role === "student");
  if (!u || !password) throw new ApiError(401, "E-mail ou senha incorretos.");
  login(u.id);
}
export function logout() {
  currentId = null;
  try { hasLS && localStorage.removeItem(SESSION); } catch { /* ignora */ }
  commit();
}
const isMentor = () => me().role === "mentor";

/* ---------- regras de projeto ---------- */
const findPost = (id) => {
  const p = state.posts.find((x) => x.id === id);
  if (!p) throw new ApiError(404, "Projeto não encontrado.");
  return p;
};
const isOwner = (p) => p.ownerId === me().id;
// "internal" = visível a estudantes da mesma instituição do autor; "private" = só o autor.
const VISIBILITIES = ["private", "internal", "public"];
const normVisibility = (v) => (VISIBILITIES.includes(v) ? v : "private");
const sameInstitution = (p) => me().role === "student" && !!p.institution && me().institution === p.institution;
const canView = (p) => p.visibility === "public" || isOwner(p) || (p.visibility === "internal" && sameInstitution(p));
const visible = (id) => {
  const p = findPost(id);
  if (!canView(p)) throw new ApiError(404, "Projeto não encontrado.");
  return p;
};
const canEdit = (p) => isOwner(p) || (isMentor() && (p.grants[me().id] || []).includes("edit"));
const canSeeRestricted = (p) => isOwner(p) || isMentor();
const ownerOnly = (p) => { if (!isOwner(p)) throw new ApiError(403, "Apenas o responsável pelo projeto pode fazer isso."); };

// Visão PÚBLICA: lista explícita de campos, restritos nunca entram aqui.
function view(p) {
  const uid = me().id;
  return {
    id: p.id, ownerId: p.ownerId, authorName: userName(p.ownerId) !== "Usuário" ? userName(p.ownerId) : p.authorName,
    title: p.title, description: p.description, category: p.category, cover: p.cover, images: p.images,
    skills: p.skills, knowledge: p.knowledge, tech: p.tech, visibility: p.visibility, createdAt: p.createdAt,
    likes: (state.likes[p.id] || []).length,
    liked: (state.likes[p.id] || []).includes(uid),
    comments: state.comments.filter((c) => c.projectId === p.id).length,
    reposts: state.reposts.filter((r) => r.projectId === p.id).length,
    reposted: state.reposts.some((r) => r.projectId === p.id && r.userId === uid),
  };
}
export function listFeed() {
  const out = [];
  state.posts.filter((p) => p.visibility !== "private" && canView(p)).forEach((p) => out.push({ key: `p-${p.id}`, type: "post", at: p.createdAt, post: view(p) }));
  state.reposts.forEach((r) => {
    const p = state.posts.find((x) => x.id === r.projectId);
    if (p && p.visibility === "public") out.push({ key: `r-${r.id}`, type: "repost", at: r.createdAt, by: userName(r.userId), post: view(p) });
  });
  return out.sort((a, b) => b.at - a.at);
}
export function listMyProjects() {
  return state.posts.filter((p) => p.ownerId === me().id).map((p) => ({
    id: p.id, title: p.title, category: p.category, visibility: p.visibility, createdAt: p.createdAt,
  }));
}
export function myStats() {
  const mine = state.posts.filter((p) => p.ownerId === me().id);
  const ids = new Set(mine.map((p) => p.id));
  return {
    projects: mine.length, published: mine.filter((p) => p.visibility === "public").length,
    likes: mine.reduce((n, p) => n + (state.likes[p.id] || []).length, 0),
    comments: state.comments.filter((c) => ids.has(c.projectId) && c.userId !== me().id).length,
    reposts: state.reposts.filter((r) => ids.has(r.projectId)).length,
  };
}
export function myNotifications() {
  const seen = new Set(state.notifReads[me().id] || []);
  const mine = new Map(state.posts.filter((p) => p.ownerId === me().id).map((p) => [p.id, p]));
  return [
    ...state.comments.filter((c) => mine.has(c.projectId) && c.userId !== me().id).map((c) => ({
      id: `c-${c.id}`, kind: "comment", at: c.at, projectId: c.projectId,
      text: `${userName(c.userId)} comentou em "${mine.get(c.projectId).title}": ${c.text}`,
    })),
    ...state.reposts.filter((r) => mine.has(r.projectId)).map((r) => ({
      id: `r-${r.id}`, kind: "repost", at: r.createdAt, projectId: r.projectId,
      text: `${userName(r.userId)} repostou "${mine.get(r.projectId).title}".`,
    })),
  ].sort((x, y) => y.at - x.at).map((n) => ({ ...n, read: seen.has(n.id) }));
}
export const unreadNotificationCount = () => (me().role === "student" ? myNotifications().filter((n) => !n.read).length : 0);
export function markNotificationsRead(ids) {
  const cur = new Set(state.notifReads[me().id] || []);
  const before = cur.size;
  ids.forEach((i) => cur.add(i));
  if (cur.size === before) return;
  state.notifReads[me().id] = [...cur];
  commit();
}
export function getPost(id) {
  const p = visible(id);
  return {
    ...view(p),
    perms: { owner: isOwner(p), edit: canEdit(p), restricted: canSeeRestricted(p) },
    grants: isOwner(p) ? { ...p.grants } : undefined,
  };
}
export function createProject(data, restrictedFiles = []) {
  if (me().role !== "student") throw new ApiError(403, "Apenas estudantes podem publicar projetos.");
  const title = String(data.title || "").trim(), description = String(data.description || "").trim();
  if (!title) throw new ApiError(400, "Informe o título do projeto.");
  if (!description) throw new ApiError(400, "Informe a descrição do projeto.");
  (data.images || []).forEach((i) => { if (!String(i).startsWith("data:image/")) throw new ApiError(400, "Imagem inválida."); });
  restrictedFiles.forEach((f) => { const e = validateFile("restricted", f); if (e) throw new ApiError(400, e); });
  const id = `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  state.posts.push({
    id, ownerId: me().id, authorName: me().name, title, description, category: data.category || "engineering",
    cover: "from-[#0B5FFF] to-[#101820]", images: (data.images || []).slice(0, 12),
    skills: data.skills || [], knowledge: data.knowledge || [], tech: data.tech || [],
    visibility: normVisibility(data.visibility), institution: me().institution || "", createdAt: Date.now(), grants: {},
  });
  if (restrictedFiles.length) storeRestricted(id, restrictedFiles); // opcional
  commit();
  return id;
}
export function updateProject(id, patch) {
  const p = visible(id);
  if (!canEdit(p)) throw new ApiError(403, "Você não tem permissão para editar este projeto.");
  for (const k of ["title", "description", "category"]) if (patch[k] !== undefined) p[k] = String(patch[k]).trim() || p[k];
  for (const k of ["skills", "knowledge", "tech"]) if (patch[k] !== undefined) p[k] = patch[k].slice(0, 20);
  if (patch.visibility !== undefined) { ownerOnly(p); p.visibility = normVisibility(patch.visibility); }
  commit();
}
export function deleteProject(id) {
  const p = visible(id); ownerOnly(p);
  state.posts = state.posts.filter((x) => x.id !== id);
  (state.restricted[id] || []).forEach((f) => fileStore.delete(f.id));
  delete state.restricted[id]; delete state.likes[id];
  state.comments = state.comments.filter((c) => c.projectId !== id);
  state.reposts = state.reposts.filter((r) => r.projectId !== id);
  commit();
}

/* ---------- arquivos restritos ---------- */
function storeRestricted(id, files) {
  const list = state.restricted[id] || (state.restricted[id] = []);
  files.forEach((f) => {
    const fid = `f-${Math.random().toString(36).slice(2, 9)}`;
    fileStore.set(fid, f);
    list.push({ id: fid, name: f.name, size: f.size, uploadedAt: Date.now() });
  });
}
export function getRestrictedFiles(id) {
  const p = visible(id);
  if (!canSeeRestricted(p)) throw new ApiError(403, "Acesso restrito a mentores autorizados.");
  return [...(state.restricted[id] || [])];
}
export function downloadRestricted(id, fileId) {
  const p = visible(id);
  if (!canSeeRestricted(p)) throw new ApiError(403, "Acesso restrito a mentores autorizados.");
  const meta = (state.restricted[id] || []).find((f) => f.id === fileId);
  if (!meta) throw new ApiError(404, "Arquivo não encontrado.");
  const blob = fileStore.get(fileId);
  return blob ? { name: meta.name, url: URL.createObjectURL(blob) } : { name: meta.name, url: null };
}
export function addRestrictedFiles(id, files) {
  const p = visible(id); ownerOnly(p);
  files.forEach((f) => { const e = validateFile("restricted", f); if (e) throw new ApiError(400, e); });
  storeRestricted(id, files); commit();
}
export function removeRestrictedFile(id, fileId) {
  const p = visible(id); ownerOnly(p);
  state.restricted[id] = (state.restricted[id] || []).filter((f) => f.id !== fileId);
  fileStore.delete(fileId); commit();
}
// Delegação: o dono só concede "edit" (nunca algo além do que ele mesmo tem) e só a mentores.
export function setEditGrant(id, userId, allowed) {
  const p = visible(id); ownerOnly(p);
  if (USERS.find((u) => u.id === userId)?.role !== "mentor") throw new ApiError(400, "A permissão só pode ser delegada a mentores.");
  if (allowed) p.grants[userId] = ["edit"]; else delete p.grants[userId];
  commit();
}

/* ---------- social ---------- */
export function toggleLike(id) {
  visible(id);
  const arr = state.likes[id] || (state.likes[id] = []);
  const i = arr.indexOf(me().id);
  if (i >= 0) arr.splice(i, 1); else arr.push(me().id); // sem duplicação: um like por usuário
  commit();
}
export function listComments(id) {
  visible(id);
  return state.comments.filter((c) => c.projectId === id).sort((a, b) => a.at - b.at)
    .map((c) => ({ ...c, authorName: userName(c.userId) }));
}
export function addComment(id, text) {
  visible(id);
  const t = String(text || "").trim();
  if (!t) throw new ApiError(400, "Escreva um comentário.");
  if (t.length > 500) throw new ApiError(400, "Comentário muito longo (máx. 500).");
  state.comments.push({ id: `c-${Date.now()}`, projectId: id, userId: me().id, text: t, at: Date.now() });
  commit();
}
export function toggleRepost(id) {
  const p = visible(id);
  if (p.visibility !== "public") throw new ApiError(403, "Apenas projetos públicos podem ser repostados.");
  if (isOwner(p)) throw new ApiError(400, "Você não pode repostar o próprio projeto.");
  const i = state.reposts.findIndex((r) => r.projectId === id && r.userId === me().id);
  if (i >= 0) state.reposts.splice(i, 1);
  else state.reposts.push({ id: `r-${Date.now()}`, projectId: id, userId: me().id, createdAt: Date.now() });
  commit();
}

/* ---------- chat exclusivo de mentores ---------- */
const requireMentor = () => { if (!isMentor()) throw new ApiError(403, "Área exclusiva para mentores."); };
function member(convId) {
  requireMentor();
  const c = state.conversations.find((x) => x.id === convId);
  if (!c || !c.members.includes(me().id)) throw new ApiError(403, "Você não participa desta conversa.");
  return c;
}
const unreadOf = (c) => {
  const since = state.reads[`${me().id}:${c.id}`] || 0;
  return state.messages.filter((m) => m.convId === c.id && m.senderId !== me().id && m.at > since).length;
};
export function listConversations() {
  requireMentor();
  return state.conversations.filter((c) => c.members.includes(me().id)).map((c) => {
    const msgs = state.messages.filter((m) => m.convId === c.id);
    return {
      id: c.id, type: c.type, members: c.members.map(userName),
      title: c.type === "group" ? c.name : userName(c.members.find((m) => m !== me().id)),
      last: msgs[msgs.length - 1] || null, unread: unreadOf(c),
    };
  }).sort((a, b) => (b.last?.at || 0) - (a.last?.at || 0));
}
export function unreadTotal() {
  if (!isMentor()) return 0;
  return state.conversations.filter((c) => c.members.includes(me().id)).reduce((n, c) => n + unreadOf(c), 0);
}
export function getMessages(convId) {
  member(convId);
  return state.messages.filter((m) => m.convId === convId).sort((a, b) => a.at - b.at)
    .map((m) => ({ ...m, senderName: userName(m.senderId), mine: m.senderId === me().id }));
}
export function sendMessage(convId, { kind, body }) {
  member(convId);
  let b = String(body || "");
  if (kind === "sticker") { if (!STICKERS.includes(b)) throw new ApiError(400, "Figurinha inválida."); }
  else if (kind === "text") { b = b.trim(); if (!b) throw new ApiError(400, "Mensagem vazia."); if (b.length > 2000) throw new ApiError(400, "Mensagem muito longa."); }
  else throw new ApiError(400, "Tipo de mensagem inválido.");
  state.messages.push({ id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, convId, senderId: me().id, kind, body: b, at: Date.now() });
  state.reads[`${me().id}:${convId}`] = Date.now();
  commit();
}
export function markRead(convId) {
  const c = member(convId);
  if (unreadOf(c) === 0) return;
  state.reads[`${me().id}:${convId}`] = Date.now(); commit();
}
export function createConversation({ type, name, memberIds }) {
  requireMentor();
  const ids = [...new Set([me().id, ...(memberIds || [])])];
  if (ids.some((id) => USERS.find((u) => u.id === id)?.role !== "mentor")) throw new ApiError(403, "Somente mentores podem participar do chat.");
  if (type === "direct") {
    if (ids.length !== 2) throw new ApiError(400, "Escolha exatamente um mentor.");
    const ex = state.conversations.find((c) => c.type === "direct" && c.members.length === 2 && ids.every((i) => c.members.includes(i)));
    if (ex) return ex.id;
  } else {
    if (ids.length < 3) throw new ApiError(400, "Um grupo precisa de pelo menos 2 outros mentores.");
    if (!String(name || "").trim()) throw new ApiError(400, "Dê um nome ao grupo.");
  }
  const id = `cv-${Date.now()}`;
  state.conversations.push({ id, type: type === "group" ? "group" : "direct", name: String(name || "").trim(), members: ids });
  commit();
  return id;
}
