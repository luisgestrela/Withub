import { getCurrentAccount, onAuthChange, signInWithEmail, signOut, signUpMentor, signUpStudent } from "./auth.js";
import {
  addProjectComment, addRestrictedFilesToProject, createConversationInDatabase, createProjectInDatabase,
  getRestrictedFileUrl, loadCommunityFeed, loadConversationMessages, loadConversations,
  loadMentorDashboardFromDatabase, loadMentorDirectory, loadMentorIndicatorsFromDatabase,
  loadMentorProfile, loadMentorProjectsFromDatabase, loadMyNotifications, loadMyProjects,
  loadProjectDetails, loadStudentSummary, loadUnpublishedProjects, removeRestrictedFileFromProject,
  runProjectRpc, sendConversationMessage, softDeleteProject, startDirectChatInDatabase,
  toggleProjectLike, toggleProjectRepost, updateMentorProfileInDatabase, updateProjectInDatabase,
} from "./database.js";

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const ROLE_LABEL = { student: "Estudante", viewer: "Visualizador", mentor: "Mentor" };
export const STAGE_LABEL = { awaiting: "Aguardando avaliação", mentoring: "Em mentoria", adjustments: "Aguardando ajustes", approved: "Aprovado", published: "Publicado", completed: "Concluído" };
export const MENTORSHIP_LABEL = { requested: "Solicitada", accepted: "Aceita", active: "Ativa", ended: "Encerrada", declined: "Recusada" };
export const homeFor = (role) => role === "mentor" ? "/mentor" : "/feed";
export const STICKERS = ["👍", "🎉", "🚀", "💡", "🔧", "🧠", "👏", "🔥", "✅", "🤝", "📐", "🧪"];
export const LIMITS = {
  image: { types: ["image/jpeg", "image/png", "image/webp"], max: 2 * 1024 * 1024 },
  restricted: { exts: ["pdf", "zip", "step", "stp", "stl", "obj", "dwg", "dxf", "f3d", "png", "jpg", "jpeg", "docx", "xlsx", "pptx", "txt"], max: 10 * 1024 * 1024 },
};
export const INSTITUTIONS = ["ITA — Instituto Tecnológico de Aeronáutica", "USP — Universidade de São Paulo", "UNICAMP", "UFMG", "Outra instituição"];
export const parseList = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20);

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

let account = null;
let ready = false;
let authSubscription = null;
let version = 0;
const subscribers = new Set();
const notify = () => { version += 1; subscribers.forEach((subscriber) => subscriber()); };
export const subscribe = (subscriber) => { subscribers.add(subscriber); return () => subscribers.delete(subscriber); };
export const getVersion = () => version;
export const me = () => account || { id: null, name: "", initials: "?", role: "student", institution: "", course: "" };
export const isLoggedIn = () => !!account;
export const isAuthReady = () => ready;

export async function initializeAuth() {
  if (authSubscription) return;
  authSubscription = onAuthChange(() => {
    getCurrentAccount().then((nextAccount) => { account = nextAccount; ready = true; notify(); })
      .catch(() => { account = null; ready = true; notify(); });
  });
  try { account = await getCurrentAccount(); }
  finally { ready = true; notify(); }
}

export async function registerStudent({ name, email, institution, course, password }) {
  const cleanedName = String(name || "").trim().replace(/\s+/g, " ");
  if (cleanedName.split(" ").length < 2) throw new ApiError(400, "Informe seu nome completo.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim())) throw new ApiError(400, "Informe um e-mail válido.");
  if (!INSTITUTIONS.includes(institution)) throw new ApiError(400, "Selecione sua instituição.");
  if (String(password || "").length < 8) throw new ApiError(400, "A senha precisa ter pelo menos 8 caracteres.");
  const result = await signUpStudent({ name: cleanedName, email, institution, course: course || "", password });
  if (result.account) { account = result.account; notify(); }
  return result;
}

export async function registerMentor(data) {
  const name = String(data.name || "").trim().replace(/\s+/g, " ");
  if (name.split(" ").length < 2) throw new ApiError(400, "Informe seu nome completo.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email || "").trim())) throw new ApiError(400, "Informe um e-mail válido.");
  if (String(data.password || "").length < 8) throw new ApiError(400, "A senha precisa ter pelo menos 8 caracteres.");
  if (data.password !== data.confirm) throw new ApiError(400, "A confirmação de senha não confere.");
  const result = await signUpMentor({ ...data, name, specialties: Array.isArray(data.specialties) ? data.specialties : parseList(data.specialties), steamAreas: data.steamAreas || [] });
  if (result.account) { account = result.account; notify(); }
  return result;
}

export async function signIn(credentials) {
  account = await signInWithEmail(credentials);
  notify();
  return account?.role;
}

export async function logout() {
  await signOut();
  account = null;
  notify();
}

export const listFeed = () => loadCommunityFeed();
export const listMyProjects = () => loadMyProjects();
export const myStats = async () => (await loadStudentSummary()).summary;
export const myNotifications = () => loadMyNotifications();
export async function unreadNotificationCount() { return (await loadMyNotifications()).filter((item) => !item.read).length; }
export const markNotificationsRead = (ids) => runProjectRpc("mark_notifications_read", { p_notification_ids: ids });
export const getPost = async (id) => {
  const context = await loadProjectDetails(id);
  if (!context) throw new ApiError(404, "Projeto não encontrado.");
  return context.post;
};
export const getPostContext = (id) => loadProjectDetails(id);
export const createProject = (data, files) => createProjectInDatabase(data, files);
export const updateProject = (id, patch) => updateProjectInDatabase(id, patch);
export const deleteProject = (id) => softDeleteProject(id);
export const getRestrictedFiles = async (id) => (await loadProjectDetails(id))?.files || [];
export const downloadRestricted = (projectId, fileId) => getRestrictedFileUrl(projectId, fileId);
export const addRestrictedFiles = (id, files) => addRestrictedFilesToProject(id, files);
export const removeRestrictedFile = (id, fileId) => removeRestrictedFileFromProject(id, fileId);
export const setEditGrant = (id, mentorId, allowed) => runProjectRpc("set_project_edit_grant", { p_project_id: id, p_mentor_id: mentorId, p_allowed: allowed });
export const toggleLike = (id) => toggleProjectLike(id);
export const listComments = async (id) => (await loadProjectDetails(id))?.comments || [];
export const addComment = (id, text) => {
  const clean = String(text || "").trim();
  if (!clean) throw new ApiError(400, "Escreva um comentário.");
  if (clean.length > 500) throw new ApiError(400, "Comentário muito longo (máx. 500).");
  return addProjectComment(id, clean);
};
export const toggleRepost = (id) => toggleProjectRepost(id);

export const updateMentorProfile = (patch) => updateMentorProfileInDatabase(patch);
export const listMentors = (query = "") => loadMentorDirectory(query);
export const getMentorProfile = (id) => loadMentorProfile(id);
export const getTeam = async (id) => (await loadProjectDetails(id))?.mentoring.team || [];
export const requestMentorship = (projectId, mentorId) => runProjectRpc("request_mentorship", { p_project_id: projectId, p_mentor_id: mentorId });
export const offerMentorship = (projectId) => runProjectRpc("offer_mentorship", { p_project_id: projectId });
export const inviteMentor = (projectId, mentorId) => runProjectRpc("invite_mentor", { p_project_id: projectId, p_mentor_id: mentorId });
export const respondMentorship = (id, accept) => runProjectRpc("respond_mentorship", { p_mentorship_id: id, p_accept: accept });
export const startMentorship = (id) => runProjectRpc("start_mentorship", { p_mentorship_id: id });
export const endMentorship = (id) => runProjectRpc("end_mentorship", { p_mentorship_id: id });
export const addPrivateNote = (id, text) => runProjectRpc("add_project_private_note", { p_project_id: id, p_text: text });
export const sendFeedback = (id, text) => runProjectRpc("send_project_feedback", { p_project_id: id, p_text: text });
export const evaluateProject = (id, { decision, justification }) => runProjectRpc("evaluate_project", { p_project_id: id, p_decision: decision, p_justification: justification });
export const publishProject = (id) => runProjectRpc("publish_project", { p_project_id: id });
export const replyToFeedback = (id, text) => runProjectRpc("reply_to_project_feedback", { p_project_id: id, p_text: text });
export const resubmitProject = (id) => runProjectRpc("resubmit_project", { p_project_id: id });
export const getHistory = async (id) => (await loadProjectDetails(id))?.history || [];
export const getMentoringState = async (id) => (await loadProjectDetails(id))?.mentoring;
export const scheduleMeeting = (id, { at, note }) => runProjectRpc("schedule_project_meeting", { p_project_id: id, p_starts_at: new Date(at).toISOString(), p_note: note || "" });
export const setMeetingStatus = (id, status) => runProjectRpc("set_project_meeting_status", { p_meeting_id: id, p_status: status });
export const listMeetings = async (id) => (await loadProjectDetails(id))?.meetings || [];
export const listMentorProjects = (filters) => loadMentorProjectsFromDatabase(filters);
export const mentorDashboard = () => loadMentorDashboardFromDatabase();
export const mentorIndicators = () => loadMentorIndicatorsFromDatabase();
export const exploreProjects = () => loadUnpublishedProjects();
export const recommendProjects = () => loadUnpublishedProjects();
export const listConversations = () => loadConversations();
export const unreadTotal = async () => (await loadConversations()).reduce((sum, item) => sum + item.unread, 0);
export const getMessages = (id) => loadConversationMessages(id);
export const sendMessage = (id, message) => sendConversationMessage(id, message);
export const markRead = (id) => runProjectRpc("mark_conversation_read", { p_conversation_id: id });
export const createConversation = (conversation) => createConversationInDatabase(conversation);
export const startDirectChat = (mentorId, projectId) => startDirectChatInDatabase(mentorId, projectId);
