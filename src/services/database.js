import { supabase } from "./supabase.js";
import { backendGet } from "./backend.js";

const unwrap = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const signedImage = async (path) => {
  const { data, error } = await supabase.storage.from("withub-project-media").createSignedUrl(path, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
};

function mapProject(row, extras = {}) {
  return {
    id: row.id, ownerId: row.owner_id, authorName: row.author_name, title: row.title,
    description: row.description, category: row.category, cover: row.cover_gradient,
    images: extras.images || [], skills: row.skills || [], knowledge: row.knowledge || [],
    tech: row.technologies || [], visibility: row.visibility, createdAt: Date.parse(row.created_at),
    likes: Number(row.like_count || 0), comments: Number(row.comment_count || 0), reposts: Number(row.repost_count || 0),
    liked: !!extras.liked, reposted: !!extras.reposted, stage: row.stage || null,
    seekingMentor: row.seeking_mentor, updatedAt: Date.parse(row.updated_at),
    mentors: extras.mentors || [], publishRequested: row.publish_requested,
    institution: row.institution || "",
    license: row.license_code ? { code: row.license_code, type: row.license_type, holder: row.license_holder, issuedAt: Date.parse(row.license_issued_at), status: row.license_status } : null,
    perms: extras.perms || { owner: false, edit: false, restricted: false },
  };
}

// Dados brutos do feed público: vêm do backend (com cache) ou, se ele não estiver
// disponível, direto do Supabase como antes.
// Depois de uma ação do próprio usuário (curtir, comentar, publicar...), o próximo
// carregamento do feed pede dados frescos ao backend em vez do cache de 30 s.
let lastMutationAt = 0;
const markFeedDirty = () => { lastMutationAt = Date.now(); };

async function fetchFeedData() {
  const fromApi = await backendGet(Date.now() - lastMutationAt < 60_000 ? "/api/feed?fresh=1" : "/api/feed");
  if (fromApi?.rows) return fromApi;
  const rows = unwrap(await supabase.from("project_feed").select("*").eq("visibility", "public").order("published_at", { ascending: false }));
  const ids = rows.map((row) => row.id);
  if (!ids.length) return { rows, teams: [], images: {}, likes: [], reposts: [] };
  const [teams, imageRows, likes, reposts] = await Promise.all([
    supabase.from("project_team").select("project_id,mentor_id,mentor_name,status,role").in("project_id", ids),
    supabase.from("project_images").select("project_id,storage_path,sort_order").in("project_id", ids).order("sort_order"),
    supabase.from("project_likes").select("project_id,user_id").in("project_id", ids),
    supabase.from("project_reposts").select("project_id,user_id,created_at").in("project_id", ids),
  ]);
  for (const result of [teams, imageRows, likes, reposts]) if (result.error) throw new Error(result.error.message);
  const images = {};
  await Promise.all((imageRows.data || []).map(async (item) => {
    (images[item.project_id] ||= [])[item.sort_order] = await signedImage(item.storage_path);
  }));
  return { rows, teams: teams.data || [], images, likes: likes.data || [], reposts: reposts.data || [] };
}

export async function loadCommunityFeed() {
  const [{ rows, teams, images, likes, reposts }, { data: userResult }] = await Promise.all([fetchFeedData(), supabase.auth.getUser()]);
  if (!rows.length) return [];
  const userId = userResult?.user?.id;
  const imagesByProject = new Map(Object.entries(images));
  const teamsData = teams, likesData = likes, repostsData = reposts;
  const byId = new Map(rows.map((row) => [row.id, row]));
  const entries = rows.map((row) => {
    const projectTeams = teamsData.filter((item) => item.project_id === row.id);
    const project = mapProject(row, {
      images: imagesByProject.get(row.id) || [],
      liked: likesData.some((item) => item.project_id === row.id && item.user_id === userId),
      reposted: repostsData.some((item) => item.project_id === row.id && item.user_id === userId),
      mentors: projectTeams.map((item) => ({ id: item.mentor_id, name: item.mentor_name, status: item.status, role: item.role })),
    });
    return { key: `p-${row.id}`, type: "post", at: project.createdAt, post: project };
  });
  // Reposts são listados separadamente para manter o formato do feed atual.
  repostsData.filter((item) => byId.has(item.project_id) && item.user_id !== userId).forEach((item) => {
    const row = byId.get(item.project_id);
    entries.push({ key: `r-${item.project_id}-${item.user_id}`, type: "repost", at: Date.parse(item.created_at), post: mapProject(row, { images: imagesByProject.get(row.id) || [] }) });
  });
  return entries.sort((a, b) => b.at - a.at);
}

export async function loadMentorDirectory(search = "") {
  const cached = await backendGet("/api/mentors");
  const rows = Array.isArray(cached) ? cached : unwrap(await supabase.from("mentor_directory").select("id,full_name,institution,avatar_path,position,specialties,steam_areas,bio,education,experience,links").order("full_name"));
  const needle = search.trim().toLowerCase();
  return rows.filter((row) => !needle || [row.full_name, row.institution, row.position, ...(row.specialties || [])].join(" ").toLowerCase().includes(needle))
    .map((row) => ({ id: row.id, name: row.full_name, initials: row.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(), institution: row.institution || "", position: row.position, specialties: row.specialties || [], steamAreas: row.steam_areas || [], bio: row.bio, education: row.education, experience: row.experience, links: row.links || {}, photo: row.avatar_path ? supabase.storage.from("withub-avatars").getPublicUrl(row.avatar_path).data.publicUrl : "" }));
}

export async function loadMentorProfile(id) {
  const row = unwrap(await supabase.from("mentor_directory").select("id,full_name,institution,avatar_path,position,specialties,steam_areas,bio,education,experience,links").eq("id", id).maybeSingle());
  if (!row) return null;
  return { id: row.id, name: row.full_name, initials: row.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(), institution: row.institution || "", position: row.position, specialties: row.specialties || [], steamAreas: row.steam_areas || [], bio: row.bio, education: row.education, experience: row.experience, links: row.links || {}, photo: row.avatar_path ? supabase.storage.from("withub-avatars").getPublicUrl(row.avatar_path).data.publicUrl : "", indicators: { tracked: 0, activeMentorships: 0, published: 0 } };
}

export async function updateMentorProfileInDatabase(patch) {
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  const userId = userResult.user?.id;
  if (!userId) throw new Error("Entre novamente para editar seu perfil.");
  if (patch.name !== undefined || patch.institution !== undefined) {
    const { error } = await supabase.from("profiles").update({ ...(patch.name !== undefined ? { full_name: patch.name.trim() } : {}), ...(patch.institution !== undefined ? { institution: patch.institution.trim() } : {}) }).eq("id", userId);
    if (error) throw new Error(error.message);
  }
  const fields = {};
  for (const [source, target] of [["position", "position"], ["specialties", "specialties"], ["steamAreas", "steam_areas"], ["bio", "bio"], ["education", "education"], ["experience", "experience"], ["links", "links"]]) if (patch[source] !== undefined) fields[target] = patch[source];
  if (Object.keys(fields).length) {
    const { error } = await supabase.from("mentor_profiles").update(fields).eq("user_id", userId);
    if (error) throw new Error(error.message);
  }
  if (patch.photo !== undefined) {
    const path = `${userId}/avatar`;
    if (patch.photo) {
      const blob = await (await fetch(patch.photo)).blob();
      const upload = await supabase.storage.from("withub-avatars").upload(path, blob, { upsert: true, contentType: blob.type });
      if (upload.error) throw new Error(upload.error.message);
      const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", userId);
      if (error) throw new Error(error.message);
    } else {
      await supabase.storage.from("withub-avatars").remove([path]);
      const { error } = await supabase.from("profiles").update({ avatar_path: null }).eq("id", userId);
      if (error) throw new Error(error.message);
    }
  }
}

export async function loadMyProjects() {
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!userResult.user) return [];
  const rows = unwrap(await supabase.from("project_feed").select("*").eq("owner_id", userResult.user.id).order("updated_at", { ascending: false }));
  return rows.map((row) => {
    const stage = row.stage;
    const status = stage && ["awaiting", "mentoring", "adjustments"].includes(stage) ? "review" : stage ? "approved" : row.visibility === "private" ? "draft" : "approved";
    const label = stage ? ({ awaiting: "Aguardando avaliação", mentoring: "Em mentoria", adjustments: "Aguardando ajustes", approved: "Aprovado", published: "Publicado", completed: "Concluído" })[stage] : row.publish_requested ? "Aguardando mentor para publicar" : ({ public: "Publicado no feed", internal: "Visível à instituição", private: "Rascunho privado" })[row.visibility];
    return { id: row.id, title: row.title, category: row.category, to: `/publicacao/${row.id}`, status, label, updated: new Date(row.updated_at).toLocaleDateString("pt-BR") };
  });
}

export async function loadStudentSummary() {
  const projects = unwrap(await supabase.from("project_feed").select("id,visibility,like_count,comment_count,repost_count").order("updated_at", { ascending: false }));
  const notifications = unwrap(await supabase.from("notifications").select("id,kind,created_at,project_id,target_path,body,read_at").order("created_at", { ascending: false }).limit(100));
  const summary = {
    projects: projects.length,
    published: projects.filter((project) => project.visibility === "public").length,
    likes: projects.reduce((sum, project) => sum + Number(project.like_count || 0), 0),
    comments: projects.reduce((sum, project) => sum + Number(project.comment_count || 0), 0),
  };
  const recent = notifications.map((item) => ({ id: item.id, kind: item.kind, at: Date.parse(item.created_at), projectId: item.project_id, to: item.target_path, text: item.body, read: !!item.read_at }));
  return { summary, recent, unread: recent.filter((item) => !item.read).length };
}

export async function loadMyNotifications() {
  const rows = unwrap(await supabase.from("notifications").select("id,kind,created_at,project_id,target_path,body,read_at").order("created_at", { ascending: false }).limit(200));
  return rows.map((item) => ({ id: item.id, kind: item.kind, at: Date.parse(item.created_at), projectId: item.project_id, to: item.target_path, text: item.body, read: !!item.read_at }));
}

export async function loadMentorProjectsFromDatabase(filters = {}) {
  const f = { status: "all", category: "all", q: "", from: "", to: "", ...filters };
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  const userId = userResult.user?.id;
  const links = unwrap(await supabase.from("mentorships").select("id,project_id,status,initiator,requested_at").eq("mentor_id", userId));
  const projectIds = [...new Set(links.map((item) => item.project_id))];
  if (!projectIds.length) return [];
  const rows = unwrap(await supabase.from("project_feed").select("*").in("id", projectIds));
  const teams = unwrap(await supabase.from("project_team").select("project_id,mentor_name").in("project_id", projectIds));
  const linksByProject = new Map(links.map((item) => [item.project_id, item]));
  return rows.map((row) => {
    const stage = row.visibility === "public" ? "published" : row.stage || "awaiting";
    const statusKey = stage === "published" ? "published" : stage;
    const label = ({ awaiting: "Aguardando avaliação", mentoring: "Em mentoria", adjustments: "Aguardando ajustes", approved: "Aprovado", published: "Publicado", completed: "Concluído" })[statusKey] || statusKey;
    const link = linksByProject.get(row.id);
    return { id: row.id, key: statusKey, label, title: row.title, cover: row.cover_gradient, image: "", summary: row.description, student: row.author_name, sentAt: link ? Date.parse(link.requested_at) : Date.parse(row.created_at), updatedAt: Date.parse(row.updated_at), category: row.category, visibility: row.visibility, mentors: teams.filter((item) => item.project_id === row.id).map((item) => item.mentor_name), post: mapProject(row) };
  }).filter((row) => {
    return (f.status === "all" || row.key === f.status) && (f.category === "all" || row.category === f.category)
      && (!f.q || row.title.toLowerCase().includes(f.q.trim().toLowerCase()))
      && (!f.from || row.sentAt >= new Date(f.from).getTime())
      && (!f.to || row.sentAt <= new Date(`${f.to}T23:59:59`).getTime());
  }).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadUnpublishedProjects() {
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  const rows = unwrap(await supabase.from("project_feed").select("*").neq("visibility", "public").order("updated_at", { ascending: false }));
  const filtered = rows.filter((row) => row.owner_id !== userResult.user?.id);
  return filtered.map((row) => ({ post: mapProject(row), reasons: [] }));
}

export async function loadMentorDashboardFromDatabase() {
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  const userId = userResult.user?.id;
  if (!userId) throw new Error("Entre novamente para acessar o painel do mentor.");
  const links = unwrap(await supabase.from("mentorships").select("id,project_id,status,initiator,requested_at,responded_at").eq("mentor_id", userId));
  const projects = await loadMentorProjectsFromDatabase();
  const notifications = await loadMyNotifications();
  const conversations = await loadConversations();
  const projectIds = projects.map((item) => item.id);
  const projectById = new Map(projects.map((item) => [item.id, item]));
  const pendingRequests = links.filter((link) => link.status === "requested" && link.initiator === "student").map((link) => {
    const project = projectById.get(link.project_id);
    return { id: link.project_id, mentorshipId: link.id, title: project?.title || "Projeto", student: project?.student || "Estudante", sentAt: Date.parse(link.requested_at) };
  });
  const pendingOffers = links.filter((item) => item.status === "requested" && item.initiator === "mentor").map((item) => {
    const project = projects.find((row) => row.id === item.project_id);
    return { id: item.project_id, title: project?.title || "Projeto", invited: false, at: Date.parse(item.requested_at) };
  });
  const upcoming = projectIds.length ? unwrap(await supabase.from("project_meetings").select("id,project_id,starts_at,note,status").in("project_id", projectIds).eq("status", "scheduled").gte("starts_at", new Date(Date.now() - 3600000).toISOString()).order("starts_at").limit(5)) : [];
  const stageOrder = ["awaiting", "mentoring", "adjustments", "approved", "published", "completed"];
  const stageLabels = { awaiting: "Aguardando avaliação", mentoring: "Em mentoria", adjustments: "Aguardando ajustes", approved: "Aprovados", published: "Publicados", completed: "Concluídos" };
  const stageBreakdown = stageOrder.map((key) => ({ key, label: stageLabels[key], count: projects.filter((item) => item.key === key).length })).filter((item) => item.count > 0);
  const attention = [
    ...pendingRequests.map((item) => ({ id: `request-${item.mentorshipId}`, type: "request", title: item.title, detail: `${item.student} solicitou mentoria`, at: item.sentAt, to: `/mentor/projetos/${item.id}`, action: "Responder" })),
    ...projects.filter((item) => item.key === "awaiting").map((item) => ({ id: `review-${item.id}`, type: "review", title: item.title, detail: `${item.student} aguarda uma avaliação`, at: item.updatedAt, to: `/mentor/projetos/${item.id}`, action: "Avaliar" })),
    ...projects.filter((item) => item.key === "approved").map((item) => ({ id: `publish-${item.id}`, type: "publish", title: item.title, detail: "Aprovado e pronto para publicação", at: item.updatedAt, to: `/mentor/projetos/${item.id}`, action: "Publicar" })),
  ].sort((a, b) => a.at - b.at).slice(0, 8);
  return {
    counts: { tracked: projects.length, active: links.filter((item) => item.status === "active").length, awaiting: projects.filter((item) => item.key === "awaiting").length, approved: projects.filter((item) => item.key === "approved").length, published: projects.filter((item) => item.key === "published").length, adjustments: projects.filter((item) => item.key === "adjustments").length, pendingRequests: pendingRequests.length, upcomingMeetings: upcoming.length, unreadConversations: conversations.reduce((sum, item) => sum + item.unread, 0) },
    pendingRequests,
    pendingOffers,
    upcoming: upcoming.map((item) => ({ id: item.id, projectId: item.project_id, at: Date.parse(item.starts_at), note: item.note, projectTitle: projects.find((project) => project.id === item.project_id)?.title || "Projeto" })),
    projects: projects.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10),
    attention,
    stageBreakdown,
    recent: notifications.slice(0, 6),
  };
}

export async function loadMentorIndicatorsFromDatabase() {
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  const userId = userResult.user?.id;
  const links = unwrap(await supabase.from("mentorships").select("id,project_id,status,initiator,requested_at,responded_at").eq("mentor_id", userId));
  const projectIds = [...new Set(links.filter((item) => ["accepted", "active", "ended"].includes(item.status)).map((item) => item.project_id))];
  const history = projectIds.length ? unwrap(await supabase.from("project_history_feed").select("id,project_id,author_id,kind,occurred_at,summary").in("project_id", projectIds).eq("author_id", userId)) : [];
  const projects = projectIds.length ? unwrap(await supabase.from("project_feed").select("id,visibility").in("id", projectIds)) : [];
  const responses = links.filter((item) => item.initiator === "student" && item.responded_at).map((item) => Date.parse(item.responded_at) - Date.parse(item.requested_at));
  return { tracked: projectIds.length, activeMentorships: links.filter((item) => item.status === "active").length, evaluations: history.filter((item) => item.kind === "decision").length, published: projects.filter((item) => item.visibility === "public").length, approvals: history.filter((item) => item.kind === "decision" && item.summary.toLowerCase().includes("aprovou")).length, adjustmentsRequested: history.filter((item) => item.kind === "decision" && item.summary.toLowerCase().includes("ajustes")).length, pendingRequests: links.filter((item) => item.status === "requested" && item.initiator === "student").length, answeredRequests: links.filter((item) => item.initiator === "student" && item.responded_at).length, avgResponseMs: responses.length ? responses.reduce((sum, value) => sum + value, 0) / responses.length : null };
}

export async function startDirectChatInDatabase(mentorId, projectId = null) {
  const { data, error } = await supabase.rpc("start_direct_chat", { p_mentor_id: mentorId, p_project_id: projectId });
  if (error) throw new Error(error.message);
  return data;
}

export async function createProjectInDatabase(data, restrictedFiles = []) {
  markFeedDirty();
  const id = unwrap(await supabase.rpc("create_project", {
    p_title: data.title.trim(), p_description: data.description.trim(), p_category: data.category,
    p_desired_visibility: data.visibility, p_seeking_mentor: !!data.seekingMentor,
    p_skills: data.skills || [], p_knowledge: data.knowledge || [], p_technologies: data.tech || [],
    p_mentor_id: data.mentorId || null,
  }));
  const uploaded = [];
  try {
    for (const [index, image] of (data.images || []).entries()) {
      const blob = await (await fetch(image.dataUrl || image)).blob();
      const path = `${id}/${crypto.randomUUID()}-${image.name || `imagem-${index + 1}`}`;
      unwrap(await supabase.storage.from("withub-project-media").upload(path, blob, { contentType: blob.type, upsert: false }));
      uploaded.push({ bucket: "withub-project-media", path });
      unwrap(await supabase.from("project_images").insert({ project_id: id, storage_path: path, original_name: image.name || `imagem-${index + 1}.${blob.type.split("/")[1]}`, mime_type: blob.type, file_size_bytes: blob.size, sort_order: index }));
    }
    for (const file of restrictedFiles) {
      const path = `${id}/${crypto.randomUUID()}-${file.name}`;
      unwrap(await supabase.storage.from("withub-project-files").upload(path, file, { contentType: file.type || undefined, upsert: false }));
      uploaded.push({ bucket: "withub-project-files", path });
      unwrap(await supabase.from("project_restricted_files").insert({ project_id: id, storage_path: path, original_name: file.name, mime_type: file.type || null, file_size_bytes: file.size }));
    }
  } catch (error) {
    for (const item of uploaded) await supabase.storage.from(item.bucket).remove([item.path]);
    throw error;
  }
  return id;
}

export async function toggleProjectLike(projectId) {
  markFeedDirty();
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  const userId = userResult.user?.id;
  if (!userId) throw new Error("Entre novamente para curtir um projeto.");
  const { data: existing, error } = await supabase.from("project_likes").select("project_id").eq("project_id", projectId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (existing) {
    const result = await supabase.from("project_likes").delete().eq("project_id", projectId).eq("user_id", userId);
    if (result.error) throw new Error(result.error.message);
  } else {
    const result = await supabase.from("project_likes").insert({ project_id: projectId, user_id: userId });
    if (result.error) throw new Error(result.error.message);
  }
}

export async function toggleProjectRepost(projectId) {
  markFeedDirty();
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  const userId = userResult.user?.id;
  if (!userId) throw new Error("Entre novamente para repostar um projeto.");
  const { data: existing, error } = await supabase.from("project_reposts").select("id").eq("project_id", projectId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (existing) {
    const result = await supabase.from("project_reposts").delete().eq("project_id", projectId).eq("user_id", userId);
    if (result.error) throw new Error(result.error.message);
  } else {
    const result = await supabase.from("project_reposts").insert({ project_id: projectId, user_id: userId });
    if (result.error) throw new Error(result.error.message);
  }
}

export async function loadProjectDetails(projectId) {
  const row = unwrap(await supabase.from("project_feed").select("*").eq("id", projectId).maybeSingle());
  if (!row) return null;
  const [{ data: userResult, error: userError }, teams, mentorships, history, meetings, imageRows, likes, reposts, comments, canEdit, canReadFiles, roleResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("project_team").select("project_id,mentor_id,mentor_name,status,role").eq("project_id", projectId),
    supabase.from("mentorships").select("id,project_id,mentor_id,status,initiator,role,invited_by,requested_at,accepted_at,started_at,ended_at").eq("project_id", projectId),
    supabase.from("project_history_feed").select("id,project_id,author_id,author_name,kind,occurred_at,summary,body,visibility,from_stage,to_stage").eq("project_id", projectId).order("occurred_at"),
    supabase.from("project_meetings").select("id,project_id,organizer_id,starts_at,note,status,created_at").eq("project_id", projectId).order("starts_at"),
    supabase.from("project_images").select("storage_path,sort_order").eq("project_id", projectId).order("sort_order"),
    supabase.from("project_likes").select("user_id").eq("project_id", projectId),
    supabase.from("project_reposts").select("user_id").eq("project_id", projectId),
    supabase.from("project_comment_feed").select("id,project_id,user_id,author_name,body,created_at").eq("project_id", projectId).order("created_at"),
    supabase.rpc("can_edit_project", { p_project_id: projectId }),
    supabase.rpc("can_view_restricted_project", { p_project_id: projectId }),
    supabase.rpc("current_app_role"),
  ]);
  if (userError) throw new Error(userError.message);
  for (const result of [teams, mentorships, history, meetings, imageRows, likes, reposts, comments, canEdit, canReadFiles, roleResult]) if (result.error) throw new Error(result.error.message);
  const userId = userResult.user?.id;
  const images = await Promise.all((imageRows.data || []).map((image) => signedImage(image.storage_path)));
  const isOwner = row.owner_id === userId;
  const mentorIds = [...new Set((mentorships.data || []).map((item) => item.mentor_id))];
  const mentorDirectory = mentorIds.length
    ? unwrap(await supabase.from("mentor_directory").select("id,full_name,institution,avatar_path,position,specialties,steam_areas,bio,education,experience,links").in("id", mentorIds))
    : [];
  const mapped = mapProject(row, {
    images,
    liked: (likes.data || []).some((item) => item.user_id === userId),
    reposted: (reposts.data || []).some((item) => item.user_id === userId),
    mentors: (teams.data || []).map((item) => ({ id: item.mentor_id, name: item.mentor_name, status: item.status, role: item.role })),
    perms: { owner: isOwner, edit: !!canEdit.data, restricted: !!canReadFiles.data },
  });
  if (isOwner) {
    const grants = unwrap(await supabase.from("project_edit_grants").select("mentor_id").eq("project_id", projectId));
    mapped.grants = Object.fromEntries(grants.map((grant) => [grant.mentor_id, ["edit"]]));
  }
  const files = mapped.perms.restricted
    ? unwrap(await supabase.from("project_restricted_files").select("id,original_name,file_size_bytes,created_at").eq("project_id", projectId).order("created_at"))
      .map((file) => ({ id: file.id, name: file.original_name, size: Number(file.file_size_bytes), uploadedAt: Date.parse(file.created_at) }))
    : [];
  const myLink = (mentorships.data || []).find((item) => item.mentor_id === userId) || null;
  const owner = isOwner;
  const role = roleResult.data;
  const activeLink = myLink?.status === "active";
  const mentoring = {
    stage: row.stage,
    stageLabel: row.stage ? ({ awaiting: "Aguardando avaliação", mentoring: "Em mentoria", adjustments: "Aguardando ajustes", approved: "Aprovado", published: "Publicado", completed: "Concluído" })[row.stage] : "",
    mine: myLink ? { id: myLink.id, mentorId: myLink.mentor_id, status: myLink.status, initiator: myLink.initiator, role: myLink.role, requestedAt: Date.parse(myLink.requested_at), startedAt: myLink.started_at ? Date.parse(myLink.started_at) : null } : null,
    team: (mentorships.data || []).map((item) => {
      const person = (teams.data || []).find((team) => team.mentor_id === item.mentor_id);
      const directory = mentorDirectory.find((mentor) => mentor.id === item.mentor_id) || {};
      return { id: item.id, mentorId: item.mentor_id, name: directory.full_name || person?.mentor_name || "Mentor", initials: (directory.full_name || "M").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(), photo: directory.avatar_path ? supabase.storage.from("withub-avatars").getPublicUrl(directory.avatar_path).data.publicUrl : "", position: directory.position || "", specialties: directory.specialties || [], status: item.status, statusLabel: ({ requested: "Solicitada", accepted: "Aceita", active: "Ativa", ended: "Encerrada", declined: "Recusada" })[item.status], initiator: item.initiator, role: item.role, invitedBy: item.invited_by, requestedAt: Date.parse(item.requested_at), startedAt: item.started_at ? Date.parse(item.started_at) : null, endedAt: item.ended_at ? Date.parse(item.ended_at) : null, canRespond: item.status === "requested" && (isOwner && item.initiator === "mentor" || item.mentor_id === userId && item.initiator === "student"), canEnd: ["accepted", "active"].includes(item.status) && (isOwner || item.mentor_id === userId) };
    }),
    canHistory: owner || !!myLink && ["accepted", "active", "ended"].includes(myLink.status),
    canNote: role === "mentor" && activeLink,
    canReview: role === "mentor" && activeLink,
    canOffer: role === "mentor" && !(mentorships.data || []).some((item) => item.mentor_id === userId && ["requested", "accepted", "active"].includes(item.status)),
    hasLiveMentorship: (mentorships.data || []).some((item) => ["accepted", "active"].includes(item.status)),
    canResubmit: owner && row.stage === "adjustments",
    transitions: { approve: role === "mentor" && activeLink && ["awaiting", "mentoring"].includes(row.stage), adjustments: role === "mentor" && activeLink && ["awaiting", "mentoring", "approved"].includes(row.stage), publish: role === "mentor" && activeLink && row.stage === "approved" && row.visibility !== "public" },
    published: row.visibility === "public",
  };
  return {
    post: mapped,
    comments: (comments.data || []).map((comment) => ({ id: comment.id, projectId: comment.project_id, userId: comment.user_id, authorName: comment.author_name, text: comment.body, at: Date.parse(comment.created_at) })),
    files,
    canHistory: mentoring.canHistory,
    mentoring,
    history: (history.data || []).map((item) => ({ id: item.id, kind: item.kind, at: Date.parse(item.occurred_at), authorId: item.author_id, authorName: item.author_name || "Usuário", summary: item.summary, text: item.body || "", visibility: item.visibility, from: item.from_stage, to: item.to_stage })),
    meetings: (meetings.data || []).map((item) => ({ id: item.id, projectId: item.project_id, organizerId: item.organizer_id, at: Date.parse(item.starts_at), note: item.note, status: item.status, organizerName: item.organizer_id === userId ? "Você" : "Mentor" })),
  };
}

export async function runProjectRpc(name, params) {
  markFeedDirty();
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new Error(error.message);
  return data;
}

export async function addProjectComment(projectId, text) {
  markFeedDirty();
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!userResult.user) throw new Error("Entre novamente para comentar.");
  const { error } = await supabase.from("project_comments").insert({ project_id: projectId, user_id: userResult.user.id, body: text.trim() });
  if (error) throw new Error(error.message);
}

export async function getRestrictedFileUrl(projectId, fileId) {
  const fromApi = await backendGet(`/api/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(fileId)}/download`);
  if (fromApi?.url) return fromApi;
  const file = unwrap(await supabase.from("project_restricted_files").select("storage_path,original_name").eq("project_id", projectId).eq("id", fileId).single());
  const { data, error } = await supabase.storage.from("withub-project-files").createSignedUrl(file.storage_path, 120);
  if (error) throw new Error(error.message);
  return { name: file.original_name, url: data.signedUrl };
}

export async function updateProjectInDatabase(projectId, patch) {
  markFeedDirty();
  if (patch.visibility !== undefined) {
    const { error } = await supabase.rpc("set_project_visibility", { p_project_id: projectId, p_visibility: patch.visibility });
    if (error) throw new Error(error.message);
  }
  if (patch.seekingMentor !== undefined) {
    const { error } = await supabase.rpc("set_project_seeking_mentor", { p_project_id: projectId, p_seeking_mentor: !!patch.seekingMentor });
    if (error) throw new Error(error.message);
  }
  const projectPatch = {};
  if (patch.title !== undefined) projectPatch.title = patch.title.trim();
  if (patch.description !== undefined) projectPatch.description = patch.description.trim();
  if (Object.keys(projectPatch).length) {
    const { error } = await supabase.from("projects").update(projectPatch).eq("id", projectId);
    if (error) throw new Error(error.message);
  }
  const tags = [
    ...(patch.skills ? patch.skills.map((label) => ({ project_id: projectId, tag_type: "skill", label })) : []),
    ...(patch.knowledge ? patch.knowledge.map((label) => ({ project_id: projectId, tag_type: "knowledge", label })) : []),
    ...(patch.tech ? patch.tech.map((label) => ({ project_id: projectId, tag_type: "technology", label })) : []),
  ];
  if (tags.length || patch.skills || patch.knowledge || patch.tech) {
    for (const type of ["skill", "knowledge", "technology"]) {
      if (!(type === "skill" ? patch.skills : type === "knowledge" ? patch.knowledge : patch.tech)) continue;
      const { error } = await supabase.from("project_tags").delete().eq("project_id", projectId).eq("tag_type", type);
      if (error) throw new Error(error.message);
    }
    if (tags.length) {
      const { error } = await supabase.from("project_tags").insert(tags);
      if (error) throw new Error(error.message);
    }
  }
}

export async function softDeleteProject(projectId) {
  markFeedDirty();
  const { error } = await supabase.rpc("soft_delete_project", { p_project_id: projectId });
  if (error) throw new Error(error.message);
}

export async function addRestrictedFilesToProject(projectId, files) {
  const uploaded = [];
  try {
    for (const file of files) {
      const path = `${projectId}/${crypto.randomUUID()}-${file.name}`;
      const upload = await supabase.storage.from("withub-project-files").upload(path, file, { contentType: file.type || undefined });
      if (upload.error) throw new Error(upload.error.message);
      uploaded.push(path);
      const insert = await supabase.from("project_restricted_files").insert({ project_id: projectId, storage_path: path, original_name: file.name, mime_type: file.type || null, file_size_bytes: file.size });
      if (insert.error) throw new Error(insert.error.message);
    }
  } catch (error) {
    if (uploaded.length) await supabase.storage.from("withub-project-files").remove(uploaded);
    throw error;
  }
}

export async function removeRestrictedFileFromProject(projectId, fileId) {
  const file = unwrap(await supabase.from("project_restricted_files").select("storage_path").eq("project_id", projectId).eq("id", fileId).single());
  const { error } = await supabase.from("project_restricted_files").delete().eq("project_id", projectId).eq("id", fileId);
  if (error) throw new Error(error.message);
  const removed = await supabase.storage.from("withub-project-files").remove([file.storage_path]);
  if (removed.error) throw new Error(removed.error.message);
}

export async function loadConversations() {
  const rows = unwrap(await supabase.from("conversation_inbox").select("*").order("last_message_at", { ascending: false, nullsFirst: false }));
  const ids = [...new Set(rows.flatMap((row) => row.member_ids || []))];
  const profiles = ids.length ? unwrap(await supabase.from("mentor_directory").select("id,full_name,avatar_path,position,specialties").in("id", ids)) : [];
  const { data: currentData } = await supabase.auth.getUser();
  return rows.map((row) => {
    const people = (row.member_ids || []).filter((id) => id !== currentData.user?.id).map((id) => {
      const profile = profiles.find((item) => item.id === id) || {};
      return { id, name: profile.full_name || "Mentor", initials: (profile.full_name || "M").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(), photo: profile.avatar_path ? supabase.storage.from("withub-avatars").getPublicUrl(profile.avatar_path).data.publicUrl : "", position: profile.position || "", specialties: profile.specialties || [] };
    });
    return { id: row.id, type: row.type, name: row.name, members: people, unread: Number(row.unread_count || 0), at: row.last_message_at ? Date.parse(row.last_message_at) : 0, lastKind: row.last_message_kind, lastBody: row.last_message_body, lastProjectId: row.last_message_project_id };
  });
}

export async function loadConversationMessages(conversationId) {
  const rows = unwrap(await supabase.from("messages").select("id,conversation_id,sender_id,kind,body,project_id,created_at").eq("conversation_id", conversationId).order("created_at"));
  const [{ data: userData }, directory, projects] = await Promise.all([
    supabase.auth.getUser(),
    loadMentorDirectory(),
    rows.some((row) => row.project_id) ? supabase.from("project_feed").select("id,title").in("id", rows.filter((row) => row.project_id).map((row) => row.project_id)) : Promise.resolve({ data: [], error: null }),
  ]);
  if (projects.error) throw new Error(projects.error.message);
  return rows.map((row) => {
    const sender = directory.find((person) => person.id === row.sender_id);
    const project = (projects.data || []).find((item) => item.id === row.project_id);
    return { id: row.id, convId: row.conversation_id, senderId: row.sender_id, senderName: row.sender_id === userData.user?.id ? "Você" : sender?.name || "Mentor", mine: row.sender_id === userData.user?.id, kind: row.kind, body: row.body || row.project_id, at: Date.parse(row.created_at), project: project ? { id: project.id, title: project.title } : null };
  });
}

export async function sendConversationMessage(conversationId, { kind, body }) {
  return runProjectRpc("send_chat_message", { p_conversation_id: conversationId, p_kind: kind, p_body: kind === "project" ? null : body, p_project_id: kind === "project" ? body : null });
}

export async function createConversationInDatabase({ type, name, memberIds }) {
  return runProjectRpc("create_conversation", { p_type: type, p_name: name || "", p_member_ids: memberIds || [] });
}
