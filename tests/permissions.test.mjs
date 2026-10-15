// Rode com: node tests/permissions.test.mjs
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
t("mentor vê restritos", () => assert.equal(api.getRestrictedFiles(id).length, 1));
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
t("rascunho privado some do feed e de terceiros", () => { api.updateProject(id, { visibility: "private" }); assert.ok(!api.listFeed().some((e) => e.post.id === id)); api.login("u-marcelo"); thr(() => api.getPost(id), 404); api.login("u-eduardo"); });
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
t("logout e entrar", () => { api.logout(); assert.equal(api.isLoggedIn(), false); thr(() => api.signIn({ email: "ana@teste.com", password: "" }), 401); api.signIn({ email: "ana@teste.com", password: "12345678" }); assert.equal(api.me().name, "Ana Paula Souza"); });
t("notificações reais: comentário de outro usuário", () => { const pid = api.listMyProjects()[0].id; api.login("u-beatriz"); api.addComment(pid, "Show!"); api.signIn({ email: "ana@teste.com", password: "x" }); assert.ok(api.myNotifications().some((x) => x.kind === "comment")); });
console.log(`\n${n} testes passaram`);

// ---- visibilidade interna, solicitação de mentor e notificações lidas ----
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
  api.signIn({ email: "colega@ita.br", password: "x" }); thr(() => api.toggleRepost(inId), 403);
  api.login("u-eduardo"); const pid = api.createProject({ title: "X", description: "d", visibility: "hack" }, []);
  assert.equal(api.getPost(pid).visibility, "private");
});
t("solicitação de mentor não cria sessão nem função mentor", () => {
  api.logout();
  api.requestMentorAccess({ name: "Maria Mentora", email: "Maria@Inst.edu", institution: api.INSTITUTIONS[0], area: "Robótica" });
  assert.equal(api.isLoggedIn(), false);
  thr(() => api.requestMentorAccess({ name: "Maria Mentora", email: "maria@inst.edu", institution: api.INSTITUTIONS[0] }), 409);
  thr(() => api.requestMentorAccess({ name: "Maria", email: "a@b.com", institution: api.INSTITUTIONS[0] }), 400);
  thr(() => api.requestMentorAccess({ name: "Ana Souza", email: "ana@teste.com", institution: api.INSTITUTIONS[0] }), 409);
  thr(() => api.signIn({ email: "maria@inst.edu", password: "12345678" }), 401);
});
t("notificações lidas persistem", () => {
  api.signIn({ email: "ana@teste.com", password: "x" });
  const n = api.myNotifications(); assert.ok(n.length && api.unreadNotificationCount() === n.length);
  api.markNotificationsRead(n.map((x) => x.id)); assert.equal(api.unreadNotificationCount(), 0);
});
console.log(`\n${n} testes passaram (total)`);
