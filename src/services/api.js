
import { projects as seedProjects, categories } from "../data/projects.js";
import { hashPassword, newSalt } from "./hash.js";

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const USERS = [
  { id: "u-eduardo", name: "Eduardo Santos", initials: "ES", role: "student", email: "eduardo.santos@ita.br", institution: "ITA — Instituto Tecnológico de Aeronáutica", course: "Engenharia de Computação" },
  { id: "u-beatriz", name: "Beatriz Alves", initials: "BA", role: "viewer" },
  {
    id: "u-marcelo", name: "Dr. Marcelo Abreu", initials: "MA", role: "mentor", institution: "ITA — Instituto Tecnológico de Aeronáutica",
    position: "Professor e pesquisador em Robótica e Automação", specialties: ["Robótica", "ROS", "LiDAR", "Visão computacional"], steamAreas: ["engineering", "technology"],
    bio: "Perfil de demonstração. Orienta projetos de robótica móvel e percepção.", education: "Doutorado em Engenharia Eletrônica", experience: "Pesquisa aplicada em navegação autônoma.", links: {}, photo: "",
  },
  {
    id: "u-renata", name: "Dra. Renata Costa", initials: "RC", role: "mentor", institution: "USP — Universidade de São Paulo",
    position: "Pesquisadora em Física Computacional", specialties: ["Física computacional", "CUDA", "Simulação numérica", "C++"], steamAreas: ["science", "mathematics"],
    bio: "Perfil de demonstração. Apoia projetos de simulação e computação de alto desempenho.", education: "Doutorado em Física", experience: "Modelagem numérica e computação em GPU.", links: {}, photo: "",
  },
  {
    id: "u-andre", name: "Prof. André Bittencourt", initials: "AB", role: "mentor", institution: "UNICAMP",
    position: "Professor de Arquitetura e Design", specialties: ["Arquitetura modular", "Revit", "Sustentabilidade", "Design de produto"], steamAreas: ["arts", "engineering"],
    bio: "Perfil de demonstração. Acompanha projetos de arquitetura e habitação.", education: "Mestrado em Arquitetura e Urbanismo", experience: "Projetos de habitação de baixo custo.", links: {}, photo: "",
  },
];
export const ROLE_LABEL = { student: "Estudante", viewer: "Visualizador", mentor: "Mentor" };
export const STAGE_LABEL = {
  awaiting: "Aguardando avaliação", mentoring: "Em mentoria", adjustments: "Aguardando ajustes",
  approved: "Aprovado", published: "Publicado", completed: "Concluído",
};
export const MENTORSHIP_LABEL = { requested: "Solicitada", accepted: "Aceita", active: "Ativa", ended: "Encerrada", declined: "Recusada" };
export const homeFor = (role) => (role === "mentor" ? "/mentor" : "/feed");
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

const KEY = "withub-mock-v1";
const SESSION = "withub-mock-session";
const fileStore = new Map(); 
const hasLS = typeof localStorage !== "undefined";

function parseBR(s) {
  const [d, m, y] = String(s).split("/").map(Number);
  return new Date(y, m - 1, d, 12).getTime();
}
function seedMentorData(posts) {
  const mentorships = [], history = [];
  posts.forEach((p) => {
    const src = seedProjects.find((x) => x.id === p.id);
    const mentor = src && USERS.find((u) => u.role === "mentor" && u.name === src.mentor);
    if (!mentor) return;
    const sent = parseBR(src.submitted), done = src.validated ? parseBR(src.validated) : sent + 864e5;
    mentorships.push({
      id: `ms-${p.id}`, projectId: p.id, mentorId: mentor.id, status: "active", initiator: "student", role: "Mentor responsável",
      requestedAt: sent, respondedAt: sent + 36e5, acceptedAt: sent + 36e5, startedAt: sent + 72e5,
    });
    history.push(
      { id: `h-${p.id}-1`, projectId: p.id, kind: "request", authorId: p.ownerId, at: sent, summary: `Enviou o projeto para a avaliação de ${mentor.name}`, visibility: "shared" },
      { id: `h-${p.id}-2`, projectId: p.id, kind: "accept", authorId: mentor.id, at: sent + 36e5, summary: `${mentor.name} aceitou a solicitação de mentoria`, visibility: "shared" },
      { id: `h-${p.id}-3`, projectId: p.id, kind: "start", authorId: mentor.id, at: sent + 72e5, summary: `${mentor.name} iniciou o acompanhamento`, visibility: "shared" },
      { id: `h-${p.id}-4`, projectId: p.id, kind: "decision", authorId: mentor.id, at: done, from: "mentoring", to: "approved", summary: `${mentor.name} aprovou o projeto`, text: "", visibility: "shared" },
    );
    p.stage = "approved";
    p.updatedAt = done;
  });
  return { mentorships, history };
}
function seed() {
  const now = Date.now(), DAY = 864e5;
  const posts = seedProjects.filter((p) => p.visibility === "public").map((p, i) => ({
    id: p.id, ownerId: p.id === "rover-lidar" ? "u-eduardo" : `ext-${p.id}`, authorName: p.team[0],
    title: p.title, description: p.summary, category: p.category, cover: p.cover, images: p.mediaImg || [],
    skills: [], knowledge: [], tech: p.stack, visibility: "public", createdAt: now - (i + 1) * DAY, grants: {},
    stage: null, seekingMentor: false, updatedAt: now - (i + 1) * DAY,
  }));
  const mentorData = seedMentorData(posts);
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
    credentials: {},
    mentorships: mentorData.mentorships,
    history: mentorData.history,
    notifications: [],
    meetings: [],
    notifReads: {},
  };
}
function migrate(s) {
  s.users = s.users || [];
  s.credentials = s.credentials || {};
  s.notifReads = s.notifReads || {};
  s.notifications = s.notifications || [];
  s.meetings = s.meetings || [];
  delete s.mentorRequests;
  if (!s.mentorships || !s.history) {
    const d = seedMentorData(s.posts);
    s.mentorships = s.mentorships || d.mentorships;
    s.history = s.history || d.history;
  }
  s.posts.forEach((p) => {
    if (p.stage === undefined) p.stage = null;
    if (p.seekingMentor === undefined) p.seekingMentor = false;
    if (!p.updatedAt) p.updatedAt = p.createdAt;
  });
  return s;
}
function load() {
  try { const raw = hasLS && localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch { /* ignora */ }
  return seed();
}
let state = migrate(load());
let persistent = hasLS;
export const isPersistent = () => persistent;
const allUsers = () => [...USERS, ...state.users];
let currentId = (hasLS && localStorage.getItem(SESSION)) || null;
let version = 0;
const subs = new Set();
function commit() {
  version++;
  try { if (hasLS) { localStorage.setItem(KEY, JSON.stringify(state)); persistent = true; } } catch { persistent = false; /* cota cheia: segue em memória */ }
  subs.forEach((f) => f());
}
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
export const getVersion = () => version;
export function resetDemo() { const { users, credentials } = state; state = seed(); state.users = users; state.credentials = credentials; fileStore.clear(); commit(); }


export const me = () => allUsers().find((u) => u.id === currentId) || USERS[0];
export const isLoggedIn = () => !!currentId && allUsers().some((u) => u.id === currentId);
export function login(id) {
  if (!allUsers().some((u) => u.id === id)) throw new ApiError(400, "Usuário inválido.");
  currentId = id;
  try { hasLS && localStorage.setItem(SESSION, id); } catch {  }
  commit();
}
const userName = (id) => allUsers().find((u) => u.id === id)?.name || "Usuário";


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
  state.users.push(user); 
  setPassword(user.id, password);
  login(user.id);
  return user.id;
}
export function signIn({ email, password }) {
  const e = String(email || "").trim().toLowerCase();
  const u = state.users.find((x) => x.email === e && (x.role === "student" || x.role === "mentor"));
  const cred = u && state.credentials[u.id];
  if (!u || !password) throw new ApiError(401, "E-mail ou senha incorretos.");
  if (cred) {
    if (hashPassword(password, cred.salt) !== cred.hash) throw new ApiError(401, "E-mail ou senha incorretos.");
  } else {
    setPassword(u.id, password);
  }
  login(u.id);
  return u.role;
}
export function logout() {
  currentId = null;
  try { hasLS && localStorage.removeItem(SESSION); } catch { /* ignora */ }
  commit();
}
const isMentor = () => me().role === "mentor";


const findPost = (id) => {
  const p = state.posts.find((x) => x.id === id);
  if (!p) throw new ApiError(404, "Projeto não encontrado.");
  return p;
};
const isOwner = (p) => p.ownerId === me().id;
const VISIBILITIES = ["private", "internal", "public"];
const normVisibility = (v) => (VISIBILITIES.includes(v) ? v : "private");
const sameInstitution = (p) => me().role === "student" && !!p.institution && me().institution === p.institution;
const canView = (p) => p.visibility === "public" || isOwner(p) || (p.visibility === "internal" && sameInstitution(p)) || hasMentorAccess(p);
const visible = (id) => {
  const p = findPost(id);
  if (!canView(p)) throw new ApiError(404, "Projeto não encontrado.");
  return p;
};
const canEdit = (p) => isOwner(p) || (isMentor() && (p.grants[me().id] || []).includes("edit"));
const canSeeRestricted = (p) => isOwner(p) || (isMentor() && !!liveLink(p));
const ownerOnly = (p) => { if (!isOwner(p)) throw new ApiError(403, "Apenas o responsável pelo projeto pode fazer isso."); };

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
    stage: p.stage || null, seekingMentor: !!p.seekingMentor, updatedAt: p.updatedAt || p.createdAt, mentors: publicTeam(p),
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
    id: p.id, title: p.title, category: p.category, visibility: p.visibility, createdAt: p.createdAt, stage: p.stage || null,
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
      id: `c-${c.id}`, kind: "comment", at: c.at, projectId: c.projectId, to: `/publicacao/${c.projectId}`,
      text: `${userName(c.userId)} comentou em "${mine.get(c.projectId).title}": ${c.text}`,
    })),
    ...state.reposts.filter((r) => mine.has(r.projectId)).map((r) => ({
      id: `r-${r.id}`, kind: "repost", at: r.createdAt, projectId: r.projectId, to: `/publicacao/${r.projectId}`,
      text: `${userName(r.userId)} repostou "${mine.get(r.projectId).title}".`,
    })),
    ...state.notifications.filter((n) => n.userId === me().id).map((n) => ({
      id: n.id, kind: n.kind, at: n.at, projectId: n.projectId || null, to: n.to, text: n.text,
    })),
  ].sort((x, y) => y.at - x.at).map((n) => ({ ...n, read: seen.has(n.id) }));
}
export const unreadNotificationCount = () => (me().role === "viewer" ? 0 : myNotifications().filter((n) => !n.read).length);
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
    stage: null, seekingMentor: !!data.seekingMentor, updatedAt: Date.now(),
  });
  if (restrictedFiles.length) storeRestricted(id, restrictedFiles); 
  commit();
  return id;
}
export function updateProject(id, patch) {
  const p = visible(id);
  if (!canEdit(p)) throw new ApiError(403, "Você não tem permissão para editar este projeto.");
  for (const k of ["title", "description", "category"]) if (patch[k] !== undefined) p[k] = String(patch[k]).trim() || p[k];
  for (const k of ["skills", "knowledge", "tech"]) if (patch[k] !== undefined) p[k] = patch[k].slice(0, 20);
  if (patch.visibility !== undefined) { ownerOnly(p); p.visibility = normVisibility(patch.visibility); }
  if (patch.seekingMentor !== undefined) { ownerOnly(p); p.seekingMentor = !!patch.seekingMentor; }
  p.updatedAt = Date.now();
  notifyProjectUpdate(p);
  commit();
}
export function deleteProject(id) {
  const p = visible(id); ownerOnly(p);
  state.posts = state.posts.filter((x) => x.id !== id);
  (state.restricted[id] || []).forEach((f) => fileStore.delete(f.id));
  delete state.restricted[id]; delete state.likes[id];
  state.comments = state.comments.filter((c) => c.projectId !== id);
  state.reposts = state.reposts.filter((r) => r.projectId !== id);
  state.mentorships = state.mentorships.filter((m) => m.projectId !== id);
  state.history = state.history.filter((h) => h.projectId !== id);
  state.meetings = state.meetings.filter((m) => m.projectId !== id);
  state.notifications = state.notifications.filter((n) => n.projectId !== id);
  commit();
}

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
export function setEditGrant(id, userId, allowed) {
  const p = visible(id); ownerOnly(p);
  if (userById(userId)?.role !== "mentor") throw new ApiError(400, "A permissão só pode ser delegada a mentores.");
  if (allowed) p.grants[userId] = ["edit"]; else delete p.grants[userId];
  commit();
}

/* ---------- social ---------- */
export function toggleLike(id) {
  visible(id);
  const arr = state.likes[id] || (state.likes[id] = []);
  const i = arr.indexOf(me().id);
  if (i >= 0) arr.splice(i, 1); else arr.push(me().id); 
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

const uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const userById = (id) => allUsers().find((u) => u.id === id);
const initialsOf = (n) => n.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
const brief = (id) => {
  const u = userById(id);
  if (!u) return { id, name: "Usuário", initials: "U", photo: "", position: "", institution: "", specialties: [] };
  return { id: u.id, name: u.name, initials: u.initials, photo: u.photo || "", position: u.position || "", institution: u.institution || "", specialties: u.specialties || [] };
};
const nameOf = (id, p) => { const u = userById(id); return u ? u.name : p && id === p.ownerId ? p.authorName : "Usuário"; };
const titleFor = (p) => (p.visibility === "public" ? `"${p.title}"` : "um projeto privado");
const requireStudent = () => { if (me().role !== "student") throw new ApiError(403, "Apenas estudantes podem fazer isso."); };
const cleanText = (v, label, { required = true, min = 1, max = 2000 } = {}) => {
  const t = String(v || "").trim();
  if (!t) { if (required) throw new ApiError(400, `Preencha ${label}.`); return ""; }
  if (t.length < min) throw new ApiError(400, `${label[0].toUpperCase()}${label.slice(1)} precisa ter pelo menos ${min} caracteres.`);
  if (t.length > max) throw new ApiError(400, `${label[0].toUpperCase()}${label.slice(1)} excede ${max} caracteres.`);
  return t;
};
function setPassword(userId, password) {
  const salt = newSalt();
  state.credentials[userId] = { salt, hash: hashPassword(password, salt) };
}
function notify(userId, { key, kind, text, to, projectId }) {
  if (!userId || !userById(userId)) return;
  const seen = new Set(state.notifReads[userId] || []);
  const dup = state.notifications.find((n) => n.userId === userId && n.key === key && !seen.has(n.id));
  if (dup) { dup.at = Date.now(); dup.text = text; return; }
  state.notifications.push({ id: uid("n"), userId, key, kind, text, to, projectId: projectId || null, at: Date.now() });
}
function readNotifications(key) {
  const mine = state.notifications.filter((n) => n.userId === me().id && n.key === key).map((n) => n.id);
  if (!mine.length) return;
  const cur = new Set(state.notifReads[me().id] || []);
  mine.forEach((i) => cur.add(i));
  state.notifReads[me().id] = [...cur];
}

const LINK_LABEL = { linkedin: "o LinkedIn", github: "o GitHub", portfolio: "o portfólio" };
const cleanUrl = (v, label) => {
  const s = String(v || "").trim();
  if (!s) return "";
  let u;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { throw new ApiError(400, `Informe um link válido para ${label}.`); }
  if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) throw new ApiError(400, `Informe um link válido para ${label}.`);
  return u.href.slice(0, 200);
};
const cleanPhoto = (v) => {
  const s = String(v || "");
  if (!s) return "";
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(s) || s.length > 300000) throw new ApiError(400, "A foto de perfil é inválida ou muito grande.");
  return s;
};
const cleanAreas = (list) => [...new Set((Array.isArray(list) ? list : []).filter((a) => categories.some((c) => c.id === a)))];
function mentorFields(d) {
  const institution = String(d.institution || "").trim().replace(/\s+/g, " ").slice(0, 120);
  const position = String(d.position || "").trim().replace(/\s+/g, " ").slice(0, 120);
  const specialties = Array.isArray(d.specialties) ? d.specialties.map((x) => String(x).trim()).filter(Boolean).slice(0, 20) : parseList(d.specialties);
  if (institution.length < 2) throw new ApiError(400, "Informe a instituição ou empresa.");
  if (position.length < 2) throw new ApiError(400, "Informe seu cargo ou área de atuação.");
  if (!specialties.length) throw new ApiError(400, "Informe ao menos uma especialidade.");
  const bio = String(d.bio || "").trim();
  if (bio.length > 600) throw new ApiError(400, "A biografia deve ter no máximo 600 caracteres.");
  const links = {};
  Object.keys(LINK_LABEL).forEach((k) => { const v = cleanUrl(d.links && d.links[k], LINK_LABEL[k]); if (v) links[k] = v; });
  return {
    institution, position, specialties, steamAreas: cleanAreas(d.steamAreas), bio,
    education: String(d.education || "").trim().slice(0, 300), experience: String(d.experience || "").trim().slice(0, 600), links, photo: cleanPhoto(d.photo),
  };
}
const cleanName = (v) => {
  const n = String(v || "").trim().replace(/\s+/g, " ");
  if (n.split(" ").length < 2) throw new ApiError(400, "Informe seu nome completo.");
  return n.slice(0, 120);
};
export function registerMentor(d) {
  const n = cleanName(d.name);
  const e = String(d.email || "").trim().toLowerCase();
  if (!EMAIL.test(e)) throw new ApiError(400, "Informe um e-mail válido.");
  if (String(d.password || "").length < 8) throw new ApiError(400, "A senha precisa ter pelo menos 8 caracteres.");
  if (d.password !== d.confirm) throw new ApiError(400, "A confirmação de senha não confere.");
  const fields = mentorFields(d);
  if (allUsers().some((u) => u.email === e)) throw new ApiError(409, "Já existe um cadastro com este e-mail.");
  const user = { id: uid("u"), name: n, email: e, role: "mentor", initials: initialsOf(n), ...fields, createdAt: Date.now() };
  state.users.push(user);
  setPassword(user.id, d.password);
  login(user.id);
  return user.id;
}
export function updateMentorProfile(patch) {
  requireMentor();
  const u = state.users.find((x) => x.id === me().id);
  if (!u) throw new ApiError(403, "Perfis de demonstração não podem ser editados.");
  const name = patch.name !== undefined ? cleanName(patch.name) : u.name;
  const fields = mentorFields({ ...u, ...patch, links: patch.links !== undefined ? patch.links : u.links });
  Object.assign(u, fields, { name, initials: initialsOf(name) });
  commit();
}
export function listMentors(q = "") {
  const needle = String(q).trim().toLowerCase();
  return allUsers().filter((u) => u.role === "mentor")
    .map((u) => ({ ...brief(u.id), steamAreas: u.steamAreas || [], isMe: u.id === me().id }))
    .filter((m) => !needle || [m.name, m.position, m.institution, ...m.specialties].join(" ").toLowerCase().includes(needle));
}
export function getMentorProfile(id) {
  const u = userById(id);
  if (!u || u.role !== "mentor") throw new ApiError(404, "Mentor não encontrado.");
  const ms = state.mentorships.filter((m) => m.mentorId === id);
  const projectsOf = (statuses) => {
    const seen = new Set();
    return ms.filter((m) => statuses.includes(m.status)).map((m) => state.posts.find((p) => p.id === m.projectId))
      .filter((p) => p && !seen.has(p.id) && seen.add(p.id) && canView(p)).map(view);
  };
  const tracked = new Set(ms.filter((m) => ["accepted", "active", "ended"].includes(m.status)).map((m) => m.projectId));
  return {
    ...brief(id), steamAreas: u.steamAreas || [], bio: u.bio || "", education: u.education || "", experience: u.experience || "", links: u.links || {},
    own: id === me().id, demo: !state.users.some((x) => x.id === id),
    following: projectsOf(["accepted", "active"]), past: projectsOf(["ended"]),
    indicators: {
      tracked: tracked.size, active: ms.filter((m) => m.status === "active").length,
      evaluations: state.history.filter((h) => h.kind === "decision" && h.authorId === id).length,
    },
  };
}

const LIVE = ["accepted", "active"];
const PENDING = ["requested", ...LIVE];
const mentorshipsOf = (id) => state.mentorships.filter((m) => m.projectId === id);
const liveLink = (p) => state.mentorships.find((m) => m.projectId === p.id && m.mentorId === me().id && LIVE.includes(m.status));
const hasMentorAccess = (p) => isMentor() && state.mentorships.some((m) => m.projectId === p.id && m.mentorId === me().id
  && (LIVE.includes(m.status) || (m.status === "requested" && m.initiator === "student")));
const publicTeam = (p) => mentorshipsOf(p.id).filter((m) => ["accepted", "active", "ended"].includes(m.status))
  .map((m) => ({ ...brief(m.mentorId), mentorId: m.mentorId, status: m.status, role: m.role }));
const findMentorship = (id) => {
  const m = state.mentorships.find((x) => x.id === id);
  if (!m) throw new ApiError(404, "Mentoria não encontrada.");
  return m;
};
const activeLink = (p) => {
  const m = state.mentorships.find((x) => x.projectId === p.id && x.mentorId === me().id && x.status === "active");
  if (!m) throw new ApiError(403, "Você precisa estar acompanhando este projeto para fazer isso.");
  return m;
};
const myMentorship = (p) => {
  const order = { active: 0, accepted: 1, requested: 2, ended: 3, declined: 4 };
  return mentorshipsOf(p.id).filter((m) => m.mentorId === me().id).sort((a, b) => order[a.status] - order[b.status])[0] || null;
};
const toMentorPage = (p) => `/mentor/projetos/${p.id}`;
const toStudentPage = (p) => `/publicacao/${p.id}`;
function syncStage(p) {
  if (p.stage === "awaiting" && !mentorshipsOf(p.id).some((m) => PENDING.includes(m.status))) p.stage = null;
}
function log(p, kind, summary, extra = {}) {
  const e = { id: uid("h"), projectId: p.id, kind, authorId: me().id, at: Date.now(), summary, visibility: kind === "note" ? "mentors" : "shared", ...extra };
  state.history.push(e);
  p.updatedAt = e.at;
  return e;
}
function openMentorship(p, mentorId, initiator, invitedBy) {
  if (state.mentorships.some((m) => m.projectId === p.id && m.mentorId === mentorId && PENDING.includes(m.status))) {
    throw new ApiError(409, "Já existe uma solicitação ou mentoria deste mentor para este projeto.");
  }
  const role = mentorshipsOf(p.id).some((m) => LIVE.includes(m.status)) ? "Mentor colaborador" : "Mentor responsável";
  const m = { id: uid("ms"), projectId: p.id, mentorId, status: "requested", initiator, role, requestedAt: Date.now() };
  if (invitedBy) m.invitedBy = invitedBy;
  state.mentorships.push(m);
  return m;
}
function notifyProjectUpdate(p) {
  const live = mentorshipsOf(p.id).filter((m) => LIVE.includes(m.status) && m.mentorId !== me().id);
  if (live.length) {
    log(p, "update", `${me().name} atualizou o projeto`);
    live.forEach((m) => notify(m.mentorId, { key: `upd:${p.id}`, kind: "update", text: `${me().name} atualizou o projeto "${p.title}".`, to: toMentorPage(p), projectId: p.id }));
  }
  if (!isOwner(p)) notify(p.ownerId, { key: `edit:${p.id}`, kind: "update", text: `${me().name} editou o projeto "${p.title}".`, to: toStudentPage(p), projectId: p.id });
}
export function getTeam(projectId) {
  const p = visible(projectId);
  const me_ = me().id, owner = isOwner(p);
  return mentorshipsOf(p.id)
    .filter((m) => ["accepted", "active", "ended"].includes(m.status) || owner || m.mentorId === me_)
    .map((m) => {
      const mine = m.mentorId === me_;
      const respondsAsMentor = m.status === "requested" && m.initiator === "student" && mine && isMentor();
      const respondsAsOwner = m.status === "requested" && m.initiator === "mentor" && owner;
      return {
        ...brief(m.mentorId), id: m.id, mentorId: m.mentorId, status: m.status, statusLabel: MENTORSHIP_LABEL[m.status], role: m.role, initiator: m.initiator,
        invitedByName: m.invitedBy ? userName(m.invitedBy) : "", requestedAt: m.requestedAt, startedAt: m.startedAt || null, endedAt: m.endedAt || null,
        canRespond: respondsAsMentor || respondsAsOwner, canStart: mine && isMentor() && m.status === "accepted", canEnd: LIVE.includes(m.status) && (mine || owner),
      };
    })
    .sort((a, b) => (a.requestedAt || 0) - (b.requestedAt || 0));
}
export function requestMentorship(projectId, mentorId) {
  requireStudent();
  const p = visible(projectId); ownerOnly(p);
  const mentor = userById(mentorId);
  if (!mentor || mentor.role !== "mentor") throw new ApiError(400, "Selecione um mentor válido.");
  const m = openMentorship(p, mentorId, "student");
  if (!p.stage || p.stage === "completed") p.stage = "awaiting";
  log(p, "request", `Solicitou mentoria a ${mentor.name}`);
  notify(mentorId, { key: `mreq:${m.id}`, kind: "request", text: `${me().name} solicitou sua mentoria no projeto "${p.title}".`, to: toMentorPage(p), projectId: p.id });
  commit();
  return m.id;
}
export function offerMentorship(projectId) {
  requireMentor();
  const p = visible(projectId);
  if (!userById(p.ownerId)) throw new ApiError(400, "Este projeto não tem um estudante cadastrado para autorizar a mentoria.");
  const m = openMentorship(p, me().id, "mentor");
  log(p, "offer", `${me().name} ofereceu mentoria`);
  notify(p.ownerId, { key: `moff:${m.id}`, kind: "request", text: `${me().name} ofereceu mentoria para o projeto "${p.title}". Aceite ou recuse na página do projeto.`, to: toStudentPage(p), projectId: p.id });
  commit();
  return m.id;
}
export function inviteMentor(projectId, mentorId) {
  requireMentor();
  const p = visible(projectId);
  activeLink(p);
  const target = userById(mentorId);
  if (!target || target.role !== "mentor" || mentorId === me().id) throw new ApiError(400, "Selecione outro mentor para convidar.");
  if (!userById(p.ownerId)) throw new ApiError(400, "Este projeto não tem um estudante cadastrado para autorizar o convite.");
  const m = openMentorship(p, mentorId, "mentor", me().id);
  log(p, "invite", `${me().name} convidou ${target.name} para colaborar`);
  notify(p.ownerId, { key: `minv:${m.id}`, kind: "request", text: `${me().name} convidou ${target.name} para colaborar no projeto "${p.title}". Autorize ou recuse na página do projeto.`, to: toStudentPage(p), projectId: p.id });
  notify(mentorId, { key: `minvd:${m.id}`, kind: "request", text: `${me().name} convidou você para colaborar em ${titleFor(p)}. O convite aguarda a autorização do estudante.`, to: "/mentor" });
  commit();
  return m.id;
}
export function respondMentorship(mentorshipId, accept) {
  const m = findMentorship(mentorshipId);
  const p = findPost(m.projectId);
  if (m.status !== "requested") throw new ApiError(409, "Esta solicitação já foi respondida.");
  const byMentor = m.initiator === "student" && m.mentorId === me().id && isMentor();
  const byOwner = m.initiator === "mentor" && isOwner(p) && me().role === "student";
  if (!byMentor && !byOwner) throw new ApiError(403, "Você não pode responder a esta solicitação.");
  m.status = accept ? "accepted" : "declined";
  m.respondedAt = Date.now();
  if (accept && (!p.stage || p.stage === "completed")) p.stage = "awaiting";
  syncStage(p);
  if (byMentor) {
    log(p, accept ? "accept" : "decline", `${me().name} ${accept ? "aceitou" : "recusou"} a solicitação de mentoria`);
    notify(p.ownerId, { key: `mresp:${m.id}`, kind: "request", text: `${me().name} ${accept ? "aceitou" : "recusou"} sua solicitação de mentoria em "${p.title}".`, to: toStudentPage(p), projectId: p.id });
  } else {
    log(p, accept ? "accept" : "decline", `${me().name} ${accept ? "autorizou" : "recusou"} a mentoria de ${userName(m.mentorId)}`);
    const text = `${me().name} ${accept ? "autorizou" : "recusou"} sua mentoria em ${titleFor(p)}.`;
    new Set([m.mentorId, m.invitedBy].filter(Boolean)).forEach((id) => notify(id, { key: `mresp:${m.id}`, kind: "request", text, to: accept ? toMentorPage(p) : "/mentor", projectId: accept ? p.id : null }));
  }
  commit();
}
export function startMentorship(mentorshipId) {
  requireMentor();
  const m = findMentorship(mentorshipId);
  if (m.mentorId !== me().id) throw new ApiError(403, "Você não pode iniciar a mentoria de outro mentor.");
  if (m.status !== "accepted") throw new ApiError(409, "Aceite a solicitação antes de iniciar o acompanhamento.");
  const p = findPost(m.projectId);
  m.status = "active";
  m.startedAt = Date.now();
  if (!p.stage || p.stage === "awaiting") p.stage = "mentoring";
  log(p, "start", `${me().name} iniciou o acompanhamento`);
  notify(p.ownerId, { key: `mstart:${m.id}`, kind: "status", text: `${me().name} iniciou o acompanhamento do projeto "${p.title}".`, to: toStudentPage(p), projectId: p.id });
  commit();
}
export function endMentorship(mentorshipId) {
  const m = findMentorship(mentorshipId);
  const p = findPost(m.projectId);
  const asMentor = m.mentorId === me().id && isMentor();
  if (!asMentor && !isOwner(p)) throw new ApiError(403, "Você não pode encerrar esta mentoria.");
  if (!LIVE.includes(m.status)) throw new ApiError(409, "Esta mentoria não está em andamento.");
  m.status = "ended";
  m.endedAt = Date.now();
  m.endedBy = me().id;
  if (!mentorshipsOf(p.id).some((x) => LIVE.includes(x.status))) p.stage = "completed";
  log(p, "end", `${me().name} encerrou a mentoria de ${userName(m.mentorId)}`);
  if (asMentor) notify(p.ownerId, { key: `mend:${m.id}`, kind: "status", text: `${me().name} encerrou o acompanhamento do projeto "${p.title}".`, to: toStudentPage(p), projectId: p.id });
  else notify(m.mentorId, { key: `mend:${m.id}`, kind: "status", text: `${me().name} encerrou a mentoria do projeto ${titleFor(p)}.`, to: "/mentor" });
  commit();
}

const DECISIONS = {
  approve: { from: ["awaiting", "mentoring"], to: "approved", summary: "aprovou o projeto" },
  adjustments: { from: ["awaiting", "mentoring", "approved"], to: "adjustments", summary: "solicitou ajustes" },
};
export function addPrivateNote(projectId, text) {
  requireMentor();
  const p = visible(projectId);
  if (!liveLink(p)) throw new ApiError(403, "Você precisa estar vinculado a este projeto para registrar orientações.");
  log(p, "note", `${me().name} registrou uma orientação privada`, { text: cleanText(text, "a orientação privada") });
  commit();
}
export function sendFeedback(projectId, text) {
  requireMentor();
  const p = visible(projectId);
  activeLink(p);
  const e = log(p, "feedback", `${me().name} enviou um feedback`, { text: cleanText(text, "o feedback") });
  notify(p.ownerId, { key: `fb:${e.id}`, kind: "feedback", text: `${me().name} enviou um feedback sobre "${p.title}".`, to: toStudentPage(p), projectId: p.id });
  commit();
}
export function evaluateProject(projectId, { decision, justification }) {
  requireMentor();
  const p = visible(projectId);
  activeLink(p);
  const rule = DECISIONS[decision];
  if (!rule) throw new ApiError(400, "Decisão inválida.");
  const text = decision === "adjustments" ? cleanText(justification, "a justificativa dos ajustes", { min: 5 }) : cleanText(justification, "a justificativa", { required: false });
  if (!rule.from.includes(p.stage)) throw new ApiError(409, "O projeto não está em uma etapa que permita esta decisão.");
  const from = p.stage;
  p.stage = rule.to;
  const e = log(p, "decision", `${me().name} ${rule.summary}`, { from, to: rule.to, text });
  const msg = decision === "approve"
    ? `${me().name} aprovou "${p.title}". A publicação continua sob o seu controle.`
    : `${me().name} solicitou ajustes em "${p.title}": ${text.slice(0, 140)}`;
  notify(p.ownerId, { key: `dec:${e.id}`, kind: "decision", text: msg, to: toStudentPage(p), projectId: p.id });
  commit();
}
export function replyToFeedback(projectId, text) {
  requireStudent();
  const p = visible(projectId); ownerOnly(p);
  const live = mentorshipsOf(p.id).filter((m) => LIVE.includes(m.status));
  if (!live.length) throw new ApiError(409, "Este projeto não tem mentoria em andamento.");
  log(p, "reply", `${me().name} respondeu ao acompanhamento`, { text: cleanText(text, "a resposta") });
  live.forEach((m) => notify(m.mentorId, { key: `rep:${p.id}`, kind: "feedback", text: `${me().name} respondeu ao feedback em "${p.title}".`, to: toMentorPage(p), projectId: p.id }));
  commit();
}
export function resubmitProject(projectId) {
  requireStudent();
  const p = visible(projectId); ownerOnly(p);
  if (p.stage !== "adjustments") throw new ApiError(409, "Só é possível reenviar projetos que aguardam ajustes.");
  p.stage = "awaiting";
  const e = log(p, "status", `${me().name} reenviou o projeto para avaliação`, { from: "adjustments", to: "awaiting" });
  mentorshipsOf(p.id).filter((m) => LIVE.includes(m.status)).forEach((m) => notify(m.mentorId, { key: `resub:${e.id}`, kind: "status", text: `${me().name} reenviou "${p.title}" para avaliação.`, to: toMentorPage(p), projectId: p.id }));
  commit();
}
export function getHistory(projectId) {
  const p = visible(projectId);
  const owner = isOwner(p);
  const linked = isMentor() && state.mentorships.some((m) => m.projectId === p.id && m.mentorId === me().id && ["accepted", "active", "ended"].includes(m.status));
  if (!owner && !linked) throw new ApiError(403, "Você não tem acesso ao histórico de acompanhamento deste projeto.");
  return state.history.filter((h) => h.projectId === p.id && (h.visibility === "shared" || linked))
    .sort((a, b) => b.at - a.at)
    .map((h) => ({ ...h, authorName: nameOf(h.authorId, p), authorInitials: brief(h.authorId).initials, mine: h.authorId === me().id }));
}
export function getMentoringState(projectId) {
  const p = visible(projectId);
  const mine = isMentor() ? myMentorship(p) : null;
  const pendingMine = mine && PENDING.includes(mine.status);
  return {
    stage: p.stage || null, stageLabel: p.stage ? STAGE_LABEL[p.stage] : null,
    mine: mine ? { id: mine.id, status: mine.status, initiator: mine.initiator } : null,
    canReview: !!mine && mine.status === "active",
    canNote: !!mine && LIVE.includes(mine.status),
    canOffer: isMentor() && !isOwner(p) && !pendingMine && !!userById(p.ownerId),
    canHistory: isOwner(p) || (!!mine && ["accepted", "active", "ended"].includes(mine.status)),
    transitions: { approve: !!mine && mine.status === "active" && DECISIONS.approve.from.includes(p.stage), adjustments: !!mine && mine.status === "active" && DECISIONS.adjustments.from.includes(p.stage) },
    canResubmit: isOwner(p) && me().role === "student" && p.stage === "adjustments",
    hasLiveMentorship: mentorshipsOf(p.id).some((m) => LIVE.includes(m.status)),
  };
}

const meetingAccess = (projectId) => {
  const p = visible(projectId);
  const linked = isMentor() && state.mentorships.some((m) => m.projectId === p.id && m.mentorId === me().id && ["accepted", "active", "ended"].includes(m.status));
  if (!isOwner(p) && !linked) throw new ApiError(403, "Você não tem acesso à agenda deste projeto.");
  return p;
};
const meetingView = (mt) => ({ ...mt, organizerName: userName(mt.organizerId), projectTitle: state.posts.find((p) => p.id === mt.projectId)?.title || "Projeto removido" });
export function scheduleMeeting(projectId, { at, note }) {
  requireMentor();
  const p = visible(projectId);
  activeLink(p);
  const when = new Date(at).getTime();
  if (!Number.isFinite(when)) throw new ApiError(400, "Informe a data e o horário do encontro.");
  if (when < Date.now() - 6e4) throw new ApiError(400, "Escolha uma data futura para o encontro.");
  const mt = { id: uid("mt"), projectId: p.id, organizerId: me().id, at: when, note: cleanText(note, "a pauta", { required: false, max: 500 }), status: "scheduled", createdAt: Date.now() };
  state.meetings.push(mt);
  log(p, "meeting", `${me().name} agendou um encontro de mentoria`, { text: new Date(when).toLocaleString("pt-BR") });
  const text = `${me().name} agendou um encontro de mentoria em ${new Date(when).toLocaleString("pt-BR")} para ${titleFor(p)}.`;
  new Set([p.ownerId, ...mentorshipsOf(p.id).filter((m) => LIVE.includes(m.status)).map((m) => m.mentorId)]).forEach((id) => {
    if (id !== me().id) notify(id, { key: `mtg:${mt.id}`, kind: "meeting", text, to: id === p.ownerId ? toStudentPage(p) : toMentorPage(p), projectId: p.id });
  });
  commit();
  return mt.id;
}
export function setMeetingStatus(meetingId, status) {
  requireMentor();
  const mt = state.meetings.find((x) => x.id === meetingId);
  if (!mt) throw new ApiError(404, "Encontro não encontrado.");
  if (!["done", "cancelled"].includes(status)) throw new ApiError(400, "Situação inválida.");
  const p = findPost(mt.projectId);
  activeLink(p);
  if (mt.status !== "scheduled") throw new ApiError(409, "Este encontro já foi encerrado.");
  mt.status = status;
  p.updatedAt = Date.now();
  commit();
}
export function listMeetings(projectId) {
  meetingAccess(projectId);
  return state.meetings.filter((m) => m.projectId === projectId).sort((a, b) => a.at - b.at).map(meetingView);
}
export function listMyMeetings() {
  requireMentor();
  const mine = new Set(state.mentorships.filter((m) => m.mentorId === me().id && ["accepted", "active", "ended"].includes(m.status)).map((m) => m.projectId));
  return state.meetings.filter((m) => mine.has(m.projectId)).sort((a, b) => a.at - b.at).map(meetingView);
}

const stageKey = (p) => (p.stage === "approved" ? (p.visibility === "public" ? "published" : "approved") : p.stage || "mentoring");
function mentorRows() {
  requireMentor();
  return state.mentorships
    .filter((m) => m.mentorId === me().id && (m.status === "ended" || LIVE.includes(m.status) || (m.status === "requested" && m.initiator === "student")))
    .map((m) => {
      const p = state.posts.find((x) => x.id === m.projectId);
      if (!p) return null;
      const pending = m.status === "requested";
      const key = m.status === "ended" ? "completed" : pending ? "awaiting" : stageKey(p);
      return {
        id: p.id, mentorshipId: m.id, mentorshipStatus: m.status, pending, key, label: STAGE_LABEL[key], title: p.title, summary: p.description,
        cover: p.cover, image: p.images[0] || "", category: p.category, visibility: p.visibility, accessible: canView(p),
        student: nameOf(p.ownerId, p), sentAt: m.requestedAt, updatedAt: p.updatedAt || p.createdAt,
        mentors: mentorshipsOf(p.id).filter((x) => LIVE.includes(x.status)).map((x) => userName(x.mentorId)),
      };
    })
    .filter(Boolean);
}
export function listMentorProjects({ q = "", status = "all", category = "all", from = "", to = "" } = {}) {
  const needle = String(q).trim().toLowerCase();
  const start = from ? new Date(`${from}T00:00:00`).getTime() : null;
  const end = to ? new Date(`${to}T23:59:59`).getTime() : null;
  return mentorRows()
    .filter((r) => (!needle || r.title.toLowerCase().includes(needle)) && (status === "all" || r.key === status)
      && (category === "all" || r.category === category) && (start === null || r.sentAt >= start) && (end === null || r.sentAt <= end))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
export function mentorDashboard() {
  const rows = mentorRows();
  const count = (k) => rows.filter((r) => r.key === k).length;
  const pendingOffers = state.mentorships.filter((m) => m.mentorId === me().id && m.status === "requested" && m.initiator === "mentor").map((m) => {
    const p = state.posts.find((x) => x.id === m.projectId);
    return p ? { id: m.id, projectId: p.id, title: p.visibility === "public" || canView(p) ? p.title : "Projeto privado", invited: !!m.invitedBy, at: m.requestedAt } : null;
  }).filter(Boolean);
  const now = Date.now();
  return {
    counts: {
      tracked: new Set(rows.filter((r) => !r.pending).map((r) => r.id)).size,
      awaiting: count("awaiting"), mentoring: count("mentoring"), adjustments: count("adjustments"), approved: count("approved"), published: count("published"), completed: count("completed"),
      pendingRequests: rows.filter((r) => r.pending).length, unreadConversations: listConversations().filter((c) => c.unread > 0).length,
    },
    pendingRequests: rows.filter((r) => r.pending), pendingOffers,
    recent: myNotifications().slice(0, 6),
    upcoming: listMyMeetings().filter((m) => m.status === "scheduled" && m.at >= now - 36e5).slice(0, 5),
  };
}
export function mentorIndicators() {
  requireMentor();
  const mine = state.mentorships.filter((m) => m.mentorId === me().id);
  const followed = mine.filter((m) => ["accepted", "active", "ended"].includes(m.status));
  const decisions = state.history.filter((h) => h.kind === "decision" && h.authorId === me().id);
  const answered = mine.filter((m) => m.initiator === "student" && m.respondedAt);
  const published = new Set(followed.filter((m) => {
    const p = state.posts.find((x) => x.id === m.projectId);
    return p && p.stage === "approved" && p.visibility === "public";
  }).map((m) => m.projectId));
  return {
    tracked: new Set(followed.map((m) => m.projectId)).size,
    activeMentorships: mine.filter((m) => m.status === "active").length,
    evaluations: decisions.length,
    approvals: decisions.filter((h) => h.to === "approved").length,
    adjustmentsRequested: decisions.filter((h) => h.to === "adjustments").length,
    published: published.size,
    pendingRequests: mine.filter((m) => m.status === "requested" && m.initiator === "student").length,
    answeredRequests: answered.length,
    avgResponseMs: answered.length ? answered.reduce((n, m) => n + (m.respondedAt - m.requestedAt), 0) / answered.length : null,
    decisions: decisions.sort((a, b) => b.at - a.at).slice(0, 10).map((h) => {
      const p = state.posts.find((x) => x.id === h.projectId);
      return { id: h.id, projectId: h.projectId, title: p ? p.title : "Projeto removido", at: h.at, to: h.to, student: p ? nameOf(p.ownerId, p) : "" };
    }),
  };
}
export function recommendProjects() {
  requireMentor();
  const u = userById(me().id);
  const specialties = (u.specialties || []).map((s) => s.toLowerCase()).filter((s) => s.length > 1);
  const areas = u.steamAreas || [];
  const blocked = new Set(state.mentorships.filter((m) => m.mentorId === me().id && PENDING.includes(m.status)).map((m) => m.projectId));
  return state.posts.filter((p) => p.visibility === "public" && !blocked.has(p.id) && !isOwner(p)).map((p) => {
    const reasons = [];
    if (areas.includes(p.category)) reasons.push(`Área STEAM: ${categories.find((c) => c.id === p.category)?.label || p.category}`);
    const tags = [...p.tech, ...p.skills, ...p.knowledge].map((t) => t.toLowerCase());
    const text = `${p.title} ${p.description}`.toLowerCase();
    specialties.forEach((s) => {
      if (tags.some((t) => t.includes(s) || s.includes(t))) reasons.push(`Especialidade "${s}" nas tecnologias e skills`);
      else if (text.includes(s)) reasons.push(`Especialidade "${s}" citada no projeto`);
    });
    return { post: view(p), reasons, seeking: !!p.seekingMentor };
  }).filter((r) => r.reasons.length > 0)
    .sort((a, b) => Number(b.seeking) - Number(a.seeking) || b.reasons.length - a.reasons.length || b.post.createdAt - a.post.createdAt);
}

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
function notifyChat(c) {
  c.members.filter((id) => id !== me().id).forEach((id) => notify(id, {
    key: `msg:${c.id}`, kind: "message", text: `${me().name} enviou uma mensagem${c.type === "group" ? ` em "${c.name}"` : ""}.`, to: `/mentor/chat/${c.id}`,
  }));
}
export function listConversations() {
  requireMentor();
  return state.conversations.filter((c) => c.members.includes(me().id)).map((c) => {
    const msgs = state.messages.filter((m) => m.convId === c.id);
    const peer = c.type === "direct" ? brief(c.members.find((m) => m !== me().id)) : null;
    return {
      id: c.id, type: c.type, members: c.members.map(userName), memberIds: c.members, peer,
      title: c.type === "group" ? c.name : peer.name, last: msgs[msgs.length - 1] || null, unread: unreadOf(c),
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
    .map((m) => {
      const base = { ...m, senderName: userName(m.senderId), mine: m.senderId === me().id };
      if (m.kind !== "project") return base;
      const p = state.posts.find((x) => x.id === m.body);
      return { ...base, project: p && canView(p) ? { id: p.id, title: p.title } : null };
    });
}
export function sendMessage(convId, { kind, body }) {
  const c = member(convId);
  let b = String(body || "");
  if (kind === "sticker") { if (!STICKERS.includes(b)) throw new ApiError(400, "Figurinha inválida."); }
  else if (kind === "text") { b = b.trim(); if (!b) throw new ApiError(400, "Mensagem vazia."); if (b.length > 2000) throw new ApiError(400, "Mensagem muito longa."); }
  else if (kind === "project") visible(b);
  else throw new ApiError(400, "Tipo de mensagem inválido.");
  state.messages.push({ id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, convId, senderId: me().id, kind, body: b, at: Date.now() });
  state.reads[`${me().id}:${convId}`] = Date.now();
  notifyChat(c);
  commit();
}
export function markRead(convId) {
  const c = member(convId);
  if (unreadOf(c) === 0) return;
  state.reads[`${me().id}:${convId}`] = Date.now();
  readNotifications(`msg:${convId}`);
  commit();
}
export function createConversation({ type, name, memberIds }) {
  requireMentor();
  const ids = [...new Set([me().id, ...(memberIds || [])])];
  if (ids.some((id) => userById(id)?.role !== "mentor")) throw new ApiError(403, "Somente mentores podem participar do chat.");
  if (type === "direct") {
    if (ids.length !== 2) throw new ApiError(400, "Escolha exatamente um mentor.");
    const ex = state.conversations.find((c) => c.type === "direct" && c.members.length === 2 && ids.every((i) => c.members.includes(i)));
    if (ex) return ex.id;
  } else {
    if (ids.length < 3) throw new ApiError(400, "Um grupo precisa de pelo menos 2 outros mentores.");
    if (!String(name || "").trim()) throw new ApiError(400, "Dê um nome ao grupo.");
  }
  const id = `cv-${Date.now()}`;
  const conv = { id, type: type === "group" ? "group" : "direct", name: String(name || "").trim(), members: ids };
  state.conversations.push(conv);
  ids.filter((x) => x !== me().id).forEach((x) => notify(x, {
    key: `conv:${id}`, kind: "message", to: `/mentor/chat/${id}`,
    text: conv.type === "group" ? `${me().name} adicionou você ao grupo "${conv.name}".` : `${me().name} iniciou uma conversa com você.`,
  }));
  commit();
  return id;
}
export function startDirectChat(mentorId, projectId) {
  requireMentor();
  const target = userById(mentorId);
  if (!target || target.role !== "mentor" || mentorId === me().id) throw new ApiError(400, "Escolha outro mentor para conversar.");
  const p = projectId ? visible(projectId) : null;
  let c = state.conversations.find((x) => x.type === "direct" && x.members.length === 2 && x.members.includes(me().id) && x.members.includes(mentorId));
  if (!c) {
    c = { id: `cv-${Date.now()}`, type: "direct", name: "", members: [me().id, mentorId] };
    state.conversations.push(c);
    notify(mentorId, { key: `conv:${c.id}`, kind: "message", text: `${me().name} iniciou uma conversa com você.`, to: `/mentor/chat/${c.id}` });
  }
  if (p && !state.messages.some((m) => m.convId === c.id && m.kind === "project" && m.body === p.id)) {
    state.messages.push({ id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, convId: c.id, senderId: me().id, kind: "project", body: p.id, at: Date.now() });
    state.reads[`${me().id}:${c.id}`] = Date.now();
    notifyChat(c);
  }
  commit();
  return c.id;
}

