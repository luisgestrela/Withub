
import assert from "node:assert/strict";
import * as api from "../src/services/api.js";

const thr = (fn, status) => assert.throws(fn, (e) => e instanceof api.ApiError && (!status || e.status === status));
const file = (name, size = 100, type = "application/octet-stream") => ({ name, size, type });
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok -", name); };

api.login("u-eduardo");
const id = api.createProject({ title: "Teste", description: "Desc", visibility: "public", skills: ["a"] }, []);
t("publica sem arquivos restritos (opcional)", () => assert.equal(api.getPost(id).title, "Teste"));
t("projeto sem restritos aparece no feed", () => assert.ok(api.listFeed().some((e) => e.post.id === id)));
t("dono adiciona arquivo restrito", () => { api.addRestrictedFiles(id, [file("m.step")]); assert.equal(api.getRestrictedFiles(id).length, 1); });
t("formato inválido é rejeitado", () => thr(() => api.addRestrictedFiles(id, [file("x.exe")]), 400));
t("arquivo grande é rejeitado", () => thr(() => api.addRestrictedFiles(id, [file("x.pdf", 11e6)]), 400));

api.login("u-beatriz");
t("visualizador NÃO acessa restritos", () => { thr(() => api.getRestrictedFiles(id), 403); const fid = "f-seed1"; thr(() => api.downloadRestricted("rover-lidar", fid), 403); });
t("visualizador NÃO edita/exclui/envia", () => { thr(() => api.updateProject(id, { title: "x" }), 403); thr(() => api.deleteProject(id), 403); thr(() => api.addRestrictedFiles(id, [file("a.pdf")]), 403); });
t("visualizador NÃO publica", () => thr(() => api.createProject({ title: "a", description: "b" }), 403));
t("visão pública não vaza restritos", () => { const json = JSON.stringify([api.getPost("rover-lidar"), api.listFeed(), api.listComments("rover-lidar")]); assert.ok(!json.includes("modelagem-chassi")); assert.ok(!json.includes("desenho-tecnico")); });
t("visualizador não acessa chat", () => { thr(() => api.listConversations(), 403); thr(() => api.sendMessage("g1", { kind: "text", body: "oi" }), 403); thr(() => api.getMessages("g1"), 403); });
t("like sem duplicar", () => { const before = api.getPost(id).likes; api.toggleLike(id); assert.equal(api.getPost(id).likes, before + 1); api.toggleLike(id); assert.equal(api.getPost(id).likes, before); });
t("repost único e identifica original", () => { api.toggleRepost(id); api.toggleRepost(id); api.toggleRepost(id); assert.equal(api.getPost(id).reposts, 1); assert.ok(api.listFeed().some((e) => e.type === "repost" && e.post.id === id)); });
t("comentário validado", () => { thr(() => api.addComment(id, "  "), 400); api.addComment(id, "legal"); assert.equal(api.getPost(id).comments, 1); });
t("não existe API para mudar a própria função", () => assert.ok(!("setRole" in api) && !("updateUser" in api)));

api.login("u-marcelo");
t("mentor sem vínculo NÃO vê arquivos restritos", () => { thr(() => api.getRestrictedFiles(id), 403); thr(() => api.downloadRestricted(id, api.getPost(id) && "x"), 403); });
api.login("u-eduardo");
const msId = api.requestMentorship(id, "u-marcelo");
api.login("u-marcelo");
api.respondMentorship(msId, true);
t("mentor com mentoria aceita vê restritos", () => assert.equal(api.getRestrictedFiles(id).length, 1));
t("mentor NÃO edita/exclui/gerencia sem permissão", () => { thr(() => api.updateProject(id, { title: "x" }), 403); thr(() => api.deleteProject(id), 403); thr(() => api.removeRestrictedFile(id, api.getRestrictedFiles(id)[0].id), 403); thr(() => api.setEditGrant(id, "u-marcelo", true), 403); });
t("mentor acessa o chat", () => { assert.ok(api.listConversations().length >= 1); api.sendMessage("g1", { kind: "text", body: "olá" }); api.sendMessage("g1", { kind: "sticker", body: "🚀" }); });
t("figurinha inválida é rejeitada", () => thr(() => api.sendMessage("g1", { kind: "sticker", body: "<script>" }), 400));
t("mentor fora da conversa é barrado", () => { api.login("u-andre"); thr(() => api.getMessages("d1"), 403); thr(() => api.sendMessage("d1", { kind: "text", body: "x" }), 403); api.login("u-marcelo"); });
t("não lidas contam e zeram", () => { api.login("u-renata"); const before = api.unreadTotal(); assert.ok(before > 0); api.markRead("g1"); assert.ok(api.unreadTotal() < before); });
t("grupo só com mentores", () => thr(() => api.createConversation({ type: "group", name: "G", memberIds: ["u-marcelo", "u-beatriz"] }), 403));

api.login("u-eduardo");
t("dono delega edição só a mentores", () => { thr(() => api.setEditGrant(id, "u-beatriz", true), 400); api.setEditGrant(id, "u-marcelo", true); });
api.login("u-marcelo");
t("mentor com permissão edita, mas segue sem excluir", () => { api.updateProject(id, { description: "nova" }); thr(() => api.deleteProject(id), 403); thr(() => api.updateProject(id, { visibility: "private" }), 403); });
api.login("u-eduardo");
t("rascunho privado some do feed e de terceiros, mas segue visível ao mentor vinculado", () => {
  api.updateProject(id, { visibility: "private" });
  assert.ok(!api.listFeed().some((e) => e.post.id === id));
  api.login("u-renata"); thr(() => api.getPost(id), 404);
  api.login("u-marcelo"); assert.equal(api.getPost(id).title, "Teste");
  api.login("u-eduardo");
});
t("dono exclui e tudo some", () => { api.deleteProject(id); thr(() => api.getPost(id), 404); });

t("cadastro de estudante cria sessão e papel student", () => {
  const uid = api.registerStudent({ name: "Ana Paula Souza", email: "Ana@Teste.com", institution: api.INSTITUTIONS[1], course: "Física", password: "12345678" });
  assert.equal(api.me().id, uid); assert.equal(api.me().role, "student"); assert.equal(api.isLoggedIn(), true);
});
t("cadastro valida dados e e-mail duplicado", () => {
  thr(() => api.registerStudent({ name: "Ana", email: "x@y.com", institution: api.INSTITUTIONS[0], password: "12345678" }), 400);
  thr(() => api.registerStudent({ name: "Ana Souza", email: "x@y", institution: api.INSTITUTIONS[0], password: "12345678" }), 400);
  thr(() => api.registerStudent({ name: "Ana Souza", email: "x@y.com", institution: api.INSTITUTIONS[0], password: "123" }), 400);
  thr(() => api.registerStudent({ name: "Ana Souza", email: "ana@teste.com", institution: api.INSTITUTIONS[0], password: "12345678" }), 409);
});
t("novo estudante publica e vê só os próprios projetos", () => { const pid = api.createProject({ title: "Meu", description: "d", visibility: "public" }); assert.deepEqual(api.listMyProjects().map((p) => p.id), [pid]); assert.equal(api.myStats().published, 1); });
t("logout e entrar", () => { api.logout(); assert.equal(api.isLoggedIn(), false); thr(() => api.signIn({ email: "ana@teste.com", password: "" }), 401); thr(() => api.signIn({ email: "ana@teste.com", password: "senhaerrada" }), 401); assert.equal(api.signIn({ email: "ana@teste.com", password: "12345678" }), "student"); assert.equal(api.me().name, "Ana Paula Souza"); });
t("notificações reais: comentário de outro usuário", () => { const pid = api.listMyProjects()[0].id; api.login("u-beatriz"); api.addComment(pid, "Show!"); api.signIn({ email: "ana@teste.com", password: "12345678" }); assert.ok(api.myNotifications().some((x) => x.kind === "comment")); });
console.log(`\n${n} testes passaram`);

api.login("u-eduardo");
const inId = api.createProject({ title: "Interno", description: "d", visibility: "internal" }, []);
t("interno aparece no feed do autor e de colegas da mesma instituição", () => {
  assert.ok(api.listFeed().some((e) => e.post.id === inId));
  api.registerStudent({ name: "Colega Do ITA", email: "colega@ita.br", institution: api.INSTITUTIONS[0], password: "12345678" });
  assert.equal(api.getPost(inId).title, "Interno"); assert.ok(api.listFeed().some((e) => e.post.id === inId));
});
t("interno NÃO aparece para outra instituição, visualizador ou mentor", () => {
  api.registerStudent({ name: "Aluno Da USP", email: "usp@usp.br", institution: api.INSTITUTIONS[1], password: "12345678" });
  thr(() => api.getPost(inId), 404); assert.ok(!api.listFeed().some((e) => e.post.id === inId));
  api.login("u-beatriz"); thr(() => api.getPost(inId), 404);
  api.login("u-marcelo"); thr(() => api.getPost(inId), 404);
});
t("interno não pode ser repostado e visibilidade inválida vira privada", () => {
  api.signIn({ email: "colega@ita.br", password: "12345678" }); thr(() => api.toggleRepost(inId), 403);
  api.login("u-eduardo"); const pid = api.createProject({ title: "X", description: "d", visibility: "hack" }, []);
  assert.equal(api.getPost(pid).visibility, "private");
});
t("conta de demonstração não entra pelo formulário de login", () => { api.logout(); thr(() => api.signIn({ email: "eduardo.santos@ita.br", password: "qualquer" }), 401); });
t("notificações lidas persistem", () => {
  api.signIn({ email: "ana@teste.com", password: "12345678" });
  const n = api.myNotifications(); assert.ok(n.length && api.unreadNotificationCount() === n.length);
  api.markNotificationsRead(n.map((x) => x.id)); assert.equal(api.unreadNotificationCount(), 0);
});


const mentorData = (over = {}) => ({
  name: "Maria Mentora", email: "Maria@Inst.edu", password: "senha1234", confirm: "senha1234", institution: "Instituto Exemplo",
  position: "Engenheira de software", specialties: "Python, Robótica", steamAreas: ["technology"], bio: "Apoio estudantes.",
  links: { linkedin: "linkedin.com/in/maria" }, ...over,
});
api.logout();
t("cadastro de mentor valida campos obrigatórios, senha e links", () => {
  thr(() => api.registerMentor(mentorData({ name: "Maria" })), 400);
  thr(() => api.registerMentor(mentorData({ email: "x@y" })), 400);
  thr(() => api.registerMentor(mentorData({ password: "123", confirm: "123" })), 400);
  thr(() => api.registerMentor(mentorData({ confirm: "outra-senha" })), 400);
  thr(() => api.registerMentor(mentorData({ institution: "" })), 400);
  thr(() => api.registerMentor(mentorData({ position: "" })), 400);
  thr(() => api.registerMentor(mentorData({ specialties: "" })), 400);
  thr(() => api.registerMentor(mentorData({ links: { github: "isso não é link" } })), 400);
  thr(() => api.registerMentor(mentorData({ photo: "data:text/html;base64,AAAA" })), 400);
  assert.equal(api.isLoggedIn(), false);
});
let mariaId;
t("cadastro de mentor registra a conta com função mentor e sessão", () => {
  mariaId = api.registerMentor(mentorData());
  assert.equal(api.me().id, mariaId); assert.equal(api.me().role, "mentor"); assert.equal(api.homeFor(api.me().role), "/mentor");
  assert.equal(api.getMentorProfile(mariaId).links.linkedin, "https://linkedin.com/in/maria");
  assert.deepEqual(api.getMentorProfile(mariaId).specialties, ["Python", "Robótica"]);
});
t("perfil público do mentor não expõe e-mail nem credenciais", () => {
  const json = JSON.stringify([api.getMentorProfile(mariaId), api.listMentors()]);
  assert.ok(!json.includes("maria@inst.edu")); assert.ok(!json.includes("hash")); assert.ok(!json.includes("salt"));
});
t("e-mail de mentor duplicado é recusado", () => { thr(() => api.registerMentor(mentorData()), 409); thr(() => api.registerMentor(mentorData({ email: "ana@teste.com" })), 409); });
t("senha do mentor não fica em texto puro", () => assert.ok(!JSON.stringify(api.listMentors()).includes("senha1234")));
t("mentor sai e entra novamente com o perfil correto", () => {
  api.logout(); assert.equal(api.isLoggedIn(), false);
  thr(() => api.signIn({ email: "maria@inst.edu", password: "errada123" }), 401);
  assert.equal(api.signIn({ email: "maria@inst.edu", password: "senha1234" }), "mentor"); assert.equal(api.me().id, mariaId);
});
t("mentor edita o próprio perfil e conta de demonstração não", () => {
  api.updateMentorProfile({ bio: "Nova bio", specialties: ["Python", "IA"] });
  assert.equal(api.getMentorProfile(mariaId).bio, "Nova bio");
  api.login("u-marcelo"); thr(() => api.updateMentorProfile({ bio: "x" }), 403);
  api.login("u-eduardo"); thr(() => api.updateMentorProfile({ bio: "x" }), 403);
});
t("aluno não acessa operações exclusivas de mentor", () => {
  api.login("u-eduardo");
  thr(() => api.mentorDashboard(), 403); thr(() => api.listMentorProjects(), 403); thr(() => api.mentorIndicators(), 403);
  thr(() => api.recommendProjects(), 403); thr(() => api.offerMentorship("rover-lidar"), 403); thr(() => api.startDirectChat("u-marcelo"), 403);
});

api.login("u-eduardo");
const pj = api.createProject({ title: "Estufa automatizada", description: "Controle de irrigação com Python", visibility: "public", category: "technology", tech: ["Python"], seekingMentor: true }, []);
t("estudante solicita mentoria e o projeto passa a aguardar avaliação", () => {
  const ms = api.requestMentorship(pj, mariaId);
  assert.equal(api.getPost(pj).stage, "awaiting");
  thr(() => api.requestMentorship(pj, mariaId), 409); thr(() => api.requestMentorship(pj, "u-beatriz"), 400);
  api.login("u-renata"); thr(() => api.respondMentorship(ms, true), 403);
  api.login(mariaId);
  assert.equal(api.mentorDashboard().counts.pendingRequests, 1); assert.equal(api.listMentorProjects({ status: "awaiting" }).length, 1);
  thr(() => api.evaluateProject(pj, { decision: "approve" }), 403); thr(() => api.startMentorship(ms), 409);
  api.respondMentorship(ms, true);
  thr(() => api.respondMentorship(ms, false), 409);
  assert.equal(api.getRestrictedFiles(pj).length, 0);
  thr(() => api.evaluateProject(pj, { decision: "approve" }), 403);
  api.startMentorship(ms);
  assert.equal(api.getPost(pj).stage, "mentoring"); assert.equal(api.listMentorProjects({ status: "mentoring" }).length, 1);
});
t("mentor visualiza apenas o que o vínculo permite, e não é atribuído por visualizar", () => {
  api.login("u-renata"); api.getPost(pj);
  assert.equal(api.getTeam(pj).filter((m) => m.mentorId === "u-renata").length, 0);
  assert.ok(!api.listMentorProjects().some((r) => r.id === pj));
  thr(() => api.getRestrictedFiles(pj), 403); thr(() => api.sendFeedback(pj, "oi"), 403); thr(() => api.addPrivateNote(pj, "oi"), 403);
});
t("avaliação exige vínculo ativo, justificativa para ajustes e registra autor", () => {
  api.login(mariaId);
  thr(() => api.evaluateProject(pj, { decision: "adjustments", justification: "" }), 400);
  thr(() => api.evaluateProject(pj, { decision: "x" }), 400);
  api.addPrivateNote(pj, "Verificar o sensor de umidade."); api.sendFeedback(pj, "Documente o circuito.");
  api.evaluateProject(pj, { decision: "adjustments", justification: "Faltam testes do sistema de irrigação." });
  assert.equal(api.getPost(pj).stage, "adjustments"); assert.equal(api.listMentorProjects({ status: "adjustments" }).length, 1);
  thr(() => api.evaluateProject(pj, { decision: "approve" }), 409);
  const h = api.getHistory(pj);
  assert.ok(h.every((e) => e.authorName && e.at)); assert.ok(h.some((e) => e.kind === "note")); assert.ok(h.some((e) => e.kind === "decision" && e.to === "adjustments"));
});
t("estudante vê feedback e decisão, mas não a orientação privada", () => {
  api.login("u-eduardo");
  const h = api.getHistory(pj);
  assert.ok(!h.some((e) => e.kind === "note")); assert.ok(h.some((e) => e.kind === "feedback")); assert.ok(!JSON.stringify(h).includes("sensor de umidade"));
  api.login("u-renata"); thr(() => api.getHistory(pj), 403);
});
t("estudante é notificado sem duplicar e consegue responder e reenviar", () => {
  api.login("u-eduardo");
  const n = api.myNotifications().filter((x) => x.projectId === pj);
  assert.equal(new Set(n.map((x) => x.id)).size, n.length);
  assert.ok(n.some((x) => /ajustes/.test(x.text)) && n.some((x) => /feedback/.test(x.text)) && n.every((x) => x.to));
  api.replyToFeedback(pj, "Vou incluir os testes."); thr(() => api.replyToFeedback(pj, " "), 400);
  thr(() => api.resubmitProject("rover-lidar"), 409);
  api.resubmitProject(pj); assert.equal(api.getPost(pj).stage, "awaiting"); thr(() => api.resubmitProject(pj), 409);
  api.login(mariaId);
  assert.ok(api.myNotifications().some((x) => /respondeu/.test(x.text))); assert.ok(api.myNotifications().some((x) => /reenviou/.test(x.text)));
});
t("aprovar não publica automaticamente e projetos aprovados e publicados ficam em abas distintas", () => {
  api.login("u-eduardo"); api.updateProject(pj, { visibility: "internal" });
  api.login(mariaId);
  api.evaluateProject(pj, { decision: "approve", justification: "Atende aos critérios." });
  assert.equal(api.getPost(pj).visibility, "internal"); assert.equal(api.listMentorProjects({ status: "approved" }).length, 1); assert.equal(api.listMentorProjects({ status: "published" }).length, 0);
  api.login("u-eduardo"); api.updateProject(pj, { visibility: "public" });
  api.login(mariaId);
  assert.equal(api.listMentorProjects({ status: "published" }).length, 1); assert.equal(api.listMentorProjects({ status: "approved" }).length, 0);
  assert.equal(api.mentorDashboard().counts.published, 1);
});
t("filtros por título, categoria e data", () => {
  assert.equal(api.listMentorProjects({ q: "estufa" }).length, 1); assert.equal(api.listMentorProjects({ q: "inexistente" }).length, 0);
  assert.equal(api.listMentorProjects({ category: "technology" }).length, 1); assert.equal(api.listMentorProjects({ category: "arts" }).length, 0);
  const d = new Date().toISOString().slice(0, 10);
  assert.equal(api.listMentorProjects({ from: d, to: d }).length, 1); assert.equal(api.listMentorProjects({ from: "2000-01-01", to: "2000-01-02" }).length, 0);
});
t("indicadores calculados dos dados reais", () => {
  const i = api.mentorIndicators();
  assert.equal(i.tracked, 1); assert.equal(i.evaluations, 2); assert.equal(i.approvals, 1); assert.equal(i.adjustmentsRequested, 1);
  assert.equal(i.published, 1); assert.equal(i.activeMentorships, 1); assert.equal(i.answeredRequests, 1); assert.ok(i.avgResponseMs >= 0);
});
t("oferta de mentoria e convite exigem autorização do estudante", () => {
  api.login("u-renata");
  const off = api.offerMentorship(pj);
  thr(() => api.offerMentorship(pj), 409); thr(() => api.respondMentorship(off, true), 403);
  thr(() => api.getRestrictedFiles(pj), 403); thr(() => api.sendFeedback(pj, "oi"), 403);
  api.login(mariaId); thr(() => api.inviteMentor(pj, mariaId), 400);
  const inv = api.inviteMentor(pj, "u-andre");
  api.login("u-andre"); thr(() => api.respondMentorship(inv, true), 403);
  api.login("u-eduardo"); api.respondMentorship(off, true); api.respondMentorship(inv, false);
  assert.equal(api.getTeam(pj).find((m) => m.id === inv).status, "declined");
  api.login("u-renata"); api.startMentorship(off);
  assert.ok(api.getTeam(pj).some((m) => m.mentorId === "u-renata" && m.status === "active" && m.role === "Mentor colaborador"));
  api.login("u-andre"); thr(() => api.getHistory(pj), 403);
});
t("equipe de mentoria identifica mentores e ocultação de pedidos pendentes", () => {
  api.login("u-beatriz");
  const team = api.getTeam(pj);
  assert.ok(team.length >= 2 && team.every((m) => ["accepted", "active", "ended"].includes(m.status)));
  assert.ok(api.getPost(pj).mentors.length >= 2);
});
t("encerrar mentoria exige vínculo, conclui o projeto sem mentores ativos", () => {
  const ms = api.getTeam(pj).find((m) => m.mentorId === mariaId).id;
  api.login("u-andre"); thr(() => api.endMentorship(ms), 403);
  api.login(mariaId); api.endMentorship(ms); thr(() => api.endMentorship(ms), 409);
  assert.equal(api.listMentorProjects({ status: "completed" }).length, 1);
  assert.equal(api.getPost(pj).stage, "approved");
  api.login("u-renata"); api.endMentorship(api.getTeam(pj).find((m) => m.mentorId === "u-renata").id);
  assert.equal(api.getPost(pj).stage, "completed");
});
t("recomendações explicam o critério usado", () => {
  api.login(mariaId);
  const r = api.recommendProjects();
  assert.ok(Array.isArray(r) && r.every((x) => x.reasons.length > 0));
  assert.ok(r.some((x) => x.reasons.some((y) => /Área STEAM/.test(y)) || x.reasons.some((y) => /Especialidade/.test(y))));
});
api.login("u-eduardo");
const pj2 = api.createProject({ title: "Ponte de macarrão", description: "Estrutura leve", visibility: "public", category: "engineering" }, []);
t("agenda de mentorias exige acompanhamento ativo", () => {
  const ms = api.requestMentorship(pj2, mariaId);
  api.login(mariaId); api.respondMentorship(ms, true);
  const at = new Date(Date.now() + 864e5).toISOString();
  thr(() => api.scheduleMeeting(pj2, { at }), 403);
  api.startMentorship(ms);
  thr(() => api.scheduleMeeting(pj2, { at: "" }), 400); thr(() => api.scheduleMeeting(pj2, { at: "2000-01-01T10:00" }), 400);
  const mt = api.scheduleMeeting(pj2, { at, note: "Revisão da estrutura" });
  assert.equal(api.listMeetings(pj2).length, 1); assert.equal(api.mentorDashboard().upcoming.length, 1);
  api.login("u-eduardo"); assert.equal(api.listMeetings(pj2).length, 1); thr(() => api.setMeetingStatus(mt, "done"), 403);
  assert.ok(api.myNotifications().some((x) => /encontro/.test(x.text)));
  api.login("u-renata"); thr(() => api.listMeetings(pj2), 403);
  api.login(mariaId); api.setMeetingStatus(mt, "done"); thr(() => api.setMeetingStatus(mt, "cancelled"), 409);
});
t("mentor é notificado ao receber solicitação e atualização, sem duplicar", () => {
  api.login("u-eduardo");
  api.updateProject(pj2, { description: "Estrutura leve e resistente" }); api.updateProject(pj2, { description: "Estrutura leve, resistente e testada" });
  api.login(mariaId);
  const n = api.myNotifications();
  assert.equal(n.filter((x) => x.projectId === pj2 && /atualizou/.test(x.text)).length, 1);
  assert.ok(n.some((x) => /solicitou sua mentoria/.test(x.text)) && n.every((x) => x.to.startsWith("/mentor")));
  assert.ok(api.unreadNotificationCount() >= 2);
  api.markNotificationsRead(n.map((x) => x.id)); assert.equal(api.unreadNotificationCount(), 0);
});
t("chat entre mentores: busca, conversa única, projeto referenciado e privacidade", () => {
  api.login(mariaId);
  assert.equal(api.listMentors("robótica").some((m) => m.id === "u-marcelo"), true); assert.equal(api.listMentors("zzzz").length, 0);
  const c1 = api.startDirectChat("u-marcelo", pj2), c2 = api.startDirectChat("u-marcelo", pj2), c3 = api.startDirectChat("u-marcelo");
  assert.equal(c1, c2); assert.equal(c1, c3);
  assert.equal(api.getMessages(c1).filter((m) => m.kind === "project").length, 1);
  assert.equal(api.getMessages(c1)[0].project.id, pj2);
  thr(() => api.startDirectChat(mariaId), 400); thr(() => api.startDirectChat("u-beatriz"), 400);
  api.sendMessage(c1, { kind: "text", body: "Olá, Marcelo!" });
  api.login("u-marcelo");
  assert.equal(api.listConversations().find((c) => c.id === c1).unread, 2);
  assert.ok(api.myNotifications().some((x) => x.to === `/mentor/chat/${c1}`));
  assert.equal(api.getMessages(c1).length, 2); api.markRead(c1); assert.equal(api.listConversations().find((c) => c.id === c1).unread, 0);
  api.login("u-renata"); thr(() => api.getMessages(c1), 403); thr(() => api.sendMessage(c1, { kind: "text", body: "x" }), 403);
  api.login("u-eduardo"); thr(() => api.getMessages(c1), 403); thr(() => api.listConversations(), 403);
});
t("exclusão do projeto remove mentorias, histórico, agenda e notificações", () => {
  api.login("u-eduardo"); api.deleteProject(pj2);
  api.login(mariaId); assert.equal(api.listMentorProjects({ q: "ponte" }).length, 0); assert.ok(!api.myNotifications().some((x) => x.projectId === pj2));
});
t("perfil público lista projetos acompanhados respeitando a visibilidade", () => {
  api.login("u-beatriz");
  const p = api.getMentorProfile("u-marcelo");
  assert.ok(p.following.some((x) => x.id === "rover-lidar")); assert.ok(!JSON.stringify(p).includes("@"));
  thr(() => api.getMentorProfile("u-eduardo"), 404);
});
t("fluxo de dados antigos: estado sem mentorias é migrado", () => assert.ok(api.getTeam("rover-lidar").some((m) => m.mentorId === "u-marcelo")));
console.log(`\n${n} testes passaram (total)`);
