import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap, FolderGit2, MessageCircle, Building2, Mail, Lock, User, BookOpen,
  ClipboardCheck, ShieldCheck, MessagesSquare, ArrowRight, ArrowLeft, Briefcase, CircleCheck,
} from "lucide-react";
import Logo from "../components/Logo";
import Notice from "../components/Notice";
import { INSTITUTIONS, registerStudent, requestMentorAccess, signIn } from "../services/api";

const studentPerks = [
  { icon: FolderGit2, title: "Publique seus projetos", text: "Monte seu portfólio com imagens, skills e tecnologias." },
  { icon: MessageCircle, title: "Interaja com a comunidade", text: "Curtidas, comentários e reposts nos seus trabalhos." },
  { icon: Building2, title: "Seja visto por empresas", text: "Anexe detalhes técnicos confidenciais para mentores." },
];
const mentorPerks = [
  { icon: ClipboardCheck, title: "Valide projetos", text: "Aprove, peça ajustes ou comente nos projetos dos estudantes." },
  { icon: ShieldCheck, title: "Acesse materiais técnicos", text: "Arquivos confidenciais ficam visíveis só para mentores autorizados." },
  { icon: MessagesSquare, title: "Converse com outros mentores", text: "Chat exclusivo para a comunidade de mentores." },
];
const field = "block w-full rounded-md border border-line bg-white py-2.5 pl-10 pr-3 text-sm text-ink placeholder-muted focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue";
const emptyMentor = { name: "", email: "", institution: "", area: "", terms: false };

function Input({ id, label, icon: Icon, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">{label}</label>
      <div className="relative mt-1">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Icon className="h-4 w-4 text-muted" /></div>
        {children}
      </div>
    </div>
  );
}

function Perks({ items }) {
  return (
    <ul className="mt-9 space-y-5">
      {items.map(({ icon: Icon, title, text }) => (
        <li key={title} className="flex gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20"><Icon className="h-5 w-5" /></span>
          <span><span className="block font-bold">{title}</span><span className="text-sm text-white/85">{text}</span></span>
        </li>
      ))}
    </ul>
  );
}

const switchBtn = "inline-flex items-center gap-2 rounded-md border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20";

export default function Register() {
  const navigate = useNavigate();
  // "student" | "mentor": define qual painel está em cada lado e qual formulário está ativo.
  const [portal, setPortal] = useState("student");
  const isStudent = portal === "student";

  // Cada formulário mantém o próprio estado: alternar de portal nunca apaga o que foi digitado.
  const [mode, setMode] = useState("signup");
  const [f, setF] = useState({ name: "", email: "", institution: "", course: "", password: "", terms: false });
  const [notice, setNotice] = useState(null);
  const [m, setM] = useState(emptyMentor);
  const [mNotice, setMNotice] = useState(null);
  const [mDone, setMDone] = useState(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setMent = (k) => (e) => setM((s) => ({ ...s, [k]: e.target.value }));

  // Depois da troca, o foco vai para o título do formulário que ficou ativo.
  const studentHead = useRef(null);
  const mentorHead = useRef(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return undefined; }
    const raf = requestAnimationFrame(() => (portal === "student" ? studentHead : mentorHead).current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(raf);
  }, [portal]);

  const submit = (e) => {
    e.preventDefault();
    try {
      if (mode === "signup") {
        if (!f.terms) throw new Error("Aceite os termos de uso e a política de privacidade (LGPD).");
        registerStudent(f);
      } else {
        signIn(f);
      }
      navigate("/feed", { replace: true });
    } catch (err) {
      setNotice({ type: "err", text: err.message });
    }
  };

  const submitMentor = (e) => {
    e.preventDefault();
    try {
      if (!m.terms) throw new Error("Aceite os termos de uso e a política de privacidade (LGPD).");
      requestMentorAccess(m);
      setMDone({ name: m.name.trim().split(/\s+/)[0], email: m.email.trim().toLowerCase() });
      setM(emptyMentor);
      setMNotice(null);
    } catch (err) {
      setMNotice({ type: "err", text: err.message });
    }
  };

  const tab = (md, label) => (
    <button type="button" onClick={() => { setMode(md); setNotice(null); }} className={`w-full rounded-md py-2.5 text-sm font-semibold transition ${mode === md ? "bg-white text-ink shadow-sm ring-1 ring-line-soft" : "text-muted hover:text-ink"}`}>{label}</button>
  );

  // Camadas sobrepostas: a ativa fica visível/interativa; a outra fica inerte (sem foco nem leitor de tela).
  const layer = (id, side) => ({ className: "reg-layer", "data-side": side, "data-active": portal === id, inert: portal !== id, "aria-hidden": portal !== id });

  return (
    <div className="reg-stage" data-portal={portal}>
      <aside className="reg-aside p-12 text-white">
        <div className="reg-bg reg-bg-student" />
        <div className="reg-bg reg-bg-mentor" />
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="relative flex items-center gap-2.5 text-xl font-bold"><img src="/favicon.png" alt="" className="h-8 w-8" /> WitHub</div>

        <div className="reg-stack">
          <div {...layer("student", "a")}>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest"><GraduationCap className="h-4 w-4" /> Portal do Estudante</span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight">Seu espaço para mostrar o que você constrói.</h1>
            <Perks items={studentPerks} />
            <div className="mt-9">
              <p className="mb-3 text-sm text-white/85">É mentor ou docente?</p>
              <button type="button" onClick={() => setPortal("mentor")} className={switchBtn}>Acessar o portal do mentor <ArrowRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div {...layer("mentor", "b")}>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest"><Briefcase className="h-4 w-4" /> Portal do Mentor</span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight">Acompanhe e valide o que seus estudantes constroem.</h1>
            <Perks items={mentorPerks} />
            <div className="mt-9">
              <p className="mb-3 text-sm text-white/85">É estudante?</p>
              <button type="button" onClick={() => setPortal("student")} className={switchBtn}><ArrowLeft className="h-4 w-4" /> Voltar ao cadastro de estudante</button>
            </div>
          </div>
        </div>

        <p className="relative text-xs text-white/70">© 2026 WitHub</p>
      </aside>

      <main className="reg-main px-5 py-10 sm:px-12">
        <div className="reg-bg reg-bg-light-student" />
        <div className="reg-bg reg-bg-light-mentor" />
        <div className="reg-stack animate-rise mx-auto w-full max-w-md">
          {/* ---------- Estudante (formulário original) ---------- */}
          <div {...layer("student", "a")}>
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <Logo />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white"><GraduationCap className="h-3.5 w-3.5" /> Portal do Estudante</span>
            </div>
            <h2 ref={studentHead} tabIndex={-1} className="text-3xl font-extrabold tracking-tight text-ink focus:outline-none">{mode === "signup" ? "Crie seu cadastro" : "Entrar no portal"}</h2>
            <p className="mt-1 text-sm text-muted">{mode === "signup" ? "Leva menos de um minuto. Depois é só publicar." : "Acesse com o e-mail que você cadastrou."}</p>

            <div className="mt-6 rounded-xl border border-line-soft bg-white p-6 shadow-xl shadow-slate-200/50">
              <div className="mb-5 flex gap-1 rounded-lg border border-line-soft bg-slate-50 p-1">{tab("signup", "Criar conta")}{tab("signin", "Entrar")}</div>
              <Notice notice={notice} />
              <form className="space-y-4" onSubmit={submit} noValidate>
                {mode === "signup" && (
                  <Input id="name" label="Nome completo" icon={User}><input id="name" required autoComplete="name" value={f.name} onChange={set("name")} placeholder="Como você se chama?" className={field} /></Input>
                )}
                <Input id="email" label="E-mail" icon={Mail}><input id="email" type="email" required autoComplete="email" value={f.email} onChange={set("email")} placeholder="voce@email.com" className={field} /></Input>
                {mode === "signup" && (
                  <>
                    <Input id="institution" label="Instituição de ensino" icon={Building2}>
                      <select id="institution" required value={f.institution} onChange={set("institution")} className={field}>
                        <option value="" disabled>Selecione sua instituição</option>
                        {INSTITUTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </Input>
                    <Input id="course" label="Curso (opcional)" icon={BookOpen}><input id="course" value={f.course} onChange={set("course")} placeholder="Ex.: Engenharia de Computação" className={field} /></Input>
                  </>
                )}
                <Input id="password" label="Senha" icon={Lock}><input id="password" type="password" required autoComplete={mode === "signup" ? "new-password" : "current-password"} value={f.password} onChange={set("password")} placeholder={mode === "signup" ? "Mínimo de 8 caracteres" : "Sua senha"} className={field} /></Input>
                {mode === "signup" && (
                  <label className="flex items-start gap-2 text-xs text-muted">
                    <input type="checkbox" checked={f.terms} onChange={(e) => setF((s) => ({ ...s, terms: e.target.checked }))} className="mt-0.5 h-4 w-4 rounded border-line text-blue" />
                    Li e aceito os termos de uso e a política de privacidade (LGPD).
                  </label>
                )}
                <button type="submit" className="w-full rounded-md bg-brand-gradient px-4 py-3 text-sm font-bold text-white transition hover:brightness-110">
                  {mode === "signup" ? "Criar conta e entrar no portal" : "Entrar"}
                </button>
              </form>
            </div>
            <p className="mt-5 text-center text-sm text-muted lg:hidden">
              É mentor ou docente?{" "}
              <button type="button" onClick={() => setPortal("mentor")} className="font-semibold text-blue hover:underline">Acessar o portal do mentor</button>
            </p>
          </div>

          {/* ---------- Mentor ---------- */}
          <div {...layer("mentor", "b")}>
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <Logo />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-graphite px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white"><Briefcase className="h-3.5 w-3.5" /> Portal do Mentor</span>
            </div>
            <h2 ref={mentorHead} tabIndex={-1} className="text-3xl font-extrabold tracking-tight text-ink focus:outline-none">{mDone ? "Solicitação enviada" : "Cadastro de mentor"}</h2>
            <p className="mt-1 text-sm text-muted">{mDone ? "Agora é só aguardar a validação do seu cadastro." : "Mentores têm acesso a materiais confidenciais, por isso o cadastro passa por validação antes da liberação."}</p>

            <div className="mt-6 rounded-xl border border-line-soft bg-white p-6 shadow-xl shadow-slate-200/50">
              {mDone ? (
                <div className="space-y-4 text-sm text-ink">
                  <p className="flex items-start gap-2"><CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-approved" /> <span>Obrigado, {mDone.name}! Registramos a solicitação para <b>{mDone.email}</b>. O acesso ao portal do mentor só é liberado depois da validação.</span></p>
                  <button type="button" onClick={() => setMDone(null)} className="w-full rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:border-blue hover:text-blue">Fazer outra solicitação</button>
                </div>
              ) : (
                <>
                  <Notice notice={mNotice} />
                  <form className="space-y-4" onSubmit={submitMentor} noValidate>
                    <Input id="m-name" label="Nome completo" icon={User}><input id="m-name" required autoComplete="name" value={m.name} onChange={setMent("name")} placeholder="Como você se chama?" className={field} /></Input>
                    <Input id="m-email" label="E-mail institucional" icon={Mail}><input id="m-email" type="email" required autoComplete="email" value={m.email} onChange={setMent("email")} placeholder="voce@instituicao.edu.br" className={field} /></Input>
                    <Input id="m-institution" label="Instituição" icon={Building2}>
                      <select id="m-institution" required value={m.institution} onChange={setMent("institution")} className={field}>
                        <option value="" disabled>Selecione sua instituição</option>
                        {INSTITUTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </Input>
                    <Input id="m-area" label="Área de atuação (opcional)" icon={BookOpen}><input id="m-area" value={m.area} onChange={setMent("area")} placeholder="Ex.: Robótica e Automação" className={field} /></Input>
                    <label className="flex items-start gap-2 text-xs text-muted">
                      <input type="checkbox" checked={m.terms} onChange={(e) => setM((s) => ({ ...s, terms: e.target.checked }))} className="mt-0.5 h-4 w-4 rounded border-line text-blue" />
                      Li e aceito os termos de uso e a política de privacidade (LGPD).
                    </label>
                    <button type="submit" className="w-full rounded-md bg-graphite px-4 py-3 text-sm font-bold text-white transition hover:brightness-125">Solicitar cadastro de mentor</button>
                  </form>
                </>
              )}
            </div>
            <p className="mt-5 text-center text-sm text-muted">
              É estudante?{" "}
              <button type="button" onClick={() => setPortal("student")} className="font-semibold text-blue hover:underline">Voltar ao cadastro de estudante</button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
