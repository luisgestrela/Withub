import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Building2, BookOpen, Link2, Lock, Mail, User } from "lucide-react";
import Logo from "./Logo";
import Notice from "./Notice";
import Avatar from "./Avatar";
import { Field, fieldClass, plainFieldClass } from "./FormField";
import { categories } from "../data/projects";
import { INSTITUTIONS, homeFor, parseList, registerMentor, signIn } from "../services/api";
import { readPhoto } from "../services/photo";

const empty = {
  name: "", email: "", password: "", confirm: "", institution: "", position: "", specialties: "", steamAreas: [], bio: "",
  links: { linkedin: "", github: "", portfolio: "" }, photo: "", terms: false,
};

export default function MentorSignup({ headRef, onSwitch }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("signup");
  const [m, setM] = useState(empty);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [notice, setNotice] = useState(null);
  const fileRef = useRef(null);
  const set = (k) => (e) => setM((s) => ({ ...s, [k]: e.target.value }));
  const setLink = (k) => (e) => setM((s) => ({ ...s, links: { ...s.links, [k]: e.target.value } }));
  const toggleArea = (a) => setM((s) => ({ ...s, steamAreas: s.steamAreas.includes(a) ? s.steamAreas.filter((x) => x !== a) : [...s.steamAreas, a] }));

  const pickPhoto = async (file) => {
    if (!file) return;
    try { const photo = await readPhoto(file); setM((s) => ({ ...s, photo })); setNotice(null); } catch (err) { setNotice({ type: "err", text: err.message }); }
  };
  const submit = (e) => {
    e.preventDefault();
    try {
      if (mode === "signup") {
        if (!m.terms) throw new Error("Aceite os termos de uso e a política de privacidade (LGPD).");
        registerMentor({ ...m, specialties: parseList(m.specialties) });
        navigate("/mentor", { replace: true, state: { welcome: true } });
      } else {
        navigate(homeFor(signIn(login)), { replace: true });
      }
    } catch (err) {
      setNotice({ type: "err", text: err.message });
    }
  };
  const tab = (md, label) => (
    <button type="button" onClick={() => { setMode(md); setNotice(null); }} className={`w-full rounded-md py-2.5 text-sm font-semibold transition ${mode === md ? "bg-white text-ink shadow-sm ring-1 ring-line-soft" : "text-muted hover:text-ink"}`}>{label}</button>
  );

  return (
    <>
      <div className="mb-6 flex items-center justify-between lg:hidden">
        <Logo />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-graphite px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white"><Briefcase className="h-3.5 w-3.5" /> Portal do Mentor</span>
      </div>
      <h2 ref={headRef} tabIndex={-1} className="text-3xl font-extrabold tracking-tight text-ink focus:outline-none">{mode === "signup" ? "Cadastro de mentor" : "Entrar como mentor"}</h2>
      <p className="mt-1 text-sm text-muted">{mode === "signup" ? "Crie sua conta para acompanhar projetos, avaliar e conversar com outros mentores." : "Acesse com o e-mail que você cadastrou."}</p>

      <div className="mt-6 rounded-xl border border-line-soft bg-white p-5 shadow-xl shadow-slate-200/50 sm:p-6">
        <div className="mb-5 flex gap-1 rounded-lg border border-line-soft bg-slate-50 p-1">{tab("signup", "Criar conta")}{tab("signin", "Entrar")}</div>
        <Notice notice={notice} />
        <form className="space-y-4" onSubmit={submit} noValidate>
          {mode === "signin" ? (
            <>
              <Field id="ml-email" label="E-mail" icon={Mail}><input id="ml-email" type="email" required autoComplete="email" value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} className={fieldClass} /></Field>
              <Field id="ml-password" label="Senha" icon={Lock}><input id="ml-password" type="password" required autoComplete="current-password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} className={fieldClass} /></Field>
              <button type="submit" className="w-full rounded-md bg-graphite px-4 py-3 text-sm font-bold text-white transition hover:brightness-125">Entrar</button>
            </>
          ) : (
            <>
              <Field id="m-name" label="Nome completo" icon={User}><input id="m-name" required autoComplete="name" value={m.name} onChange={set("name")} placeholder="Como você se chama?" className={fieldClass} /></Field>
              <Field id="m-email" label="E-mail" icon={Mail}><input id="m-email" type="email" required autoComplete="email" value={m.email} onChange={set("email")} placeholder="voce@instituicao.edu.br" className={fieldClass} /></Field>
              <Field id="m-password" label="Senha" icon={Lock}><input id="m-password" type="password" required autoComplete="new-password" value={m.password} onChange={set("password")} placeholder="Mínimo de 8 caracteres" className={fieldClass} /></Field>
              <Field id="m-confirm" label="Confirmar senha" icon={Lock}><input id="m-confirm" type="password" required autoComplete="new-password" value={m.confirm} onChange={set("confirm")} placeholder="Repita a senha" className={fieldClass} /></Field>
              <div>
                <span className="block text-sm font-medium text-ink">Foto de perfil (opcional)</span>
                <div className="mt-1 flex items-center gap-3">
                  <Avatar person={{ initials: m.name.trim() ? m.name.trim()[0].toUpperCase() : "?", photo: m.photo }} size="lg" />
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Escolher foto de perfil" className="hidden" onChange={(e) => { pickPhoto(e.target.files[0]); e.target.value = ""; }} />
                  <button type="button" onClick={() => fileRef.current?.click()} className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-blue hover:text-blue">Escolher foto</button>
                  {m.photo && <button type="button" onClick={() => setM((s) => ({ ...s, photo: "" }))} className="text-xs font-semibold text-muted hover:text-red-600">Remover</button>}
                </div>
              </div>
              <Field id="m-institution" label="Instituição ou empresa" icon={Building2}>
                <input id="m-institution" required list="m-institutions" value={m.institution} onChange={set("institution")} placeholder="Onde você atua" className={fieldClass} />
                <datalist id="m-institutions">{INSTITUTIONS.map((i) => <option key={i} value={i} />)}</datalist>
              </Field>
              <Field id="m-position" label="Cargo ou área de atuação" icon={Briefcase}><input id="m-position" required value={m.position} onChange={set("position")} placeholder="Ex.: Professor de Robótica" className={fieldClass} /></Field>
              <Field id="m-specialties" label="Especialidades e áreas de conhecimento" icon={BookOpen} hint="Separe por vírgula. Ex.: Robótica, Python, Visão computacional"><input id="m-specialties" required value={m.specialties} onChange={set("specialties")} className={fieldClass} /></Field>
              <fieldset>
                <legend className="text-sm font-medium text-ink">Áreas STEAM (opcional)</legend>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5">
                  {categories.map((c) => <label key={c.id} className="flex items-center gap-1.5 text-sm text-ink"><input type="checkbox" checked={m.steamAreas.includes(c.id)} onChange={() => toggleArea(c.id)} className="h-4 w-4 rounded border-line text-blue" /> {c.label}</label>)}
                </div>
              </fieldset>
              <Field id="m-bio" label="Biografia e como pode ajudar os estudantes (opcional)" hint={`${m.bio.length}/600 caracteres`}><textarea id="m-bio" rows={3} maxLength={600} value={m.bio} onChange={set("bio")} className={plainFieldClass} /></Field>
              {[["linkedin", "LinkedIn"], ["github", "GitHub"], ["portfolio", "Portfólio"]].map(([k, l]) => (
                <Field key={k} id={`m-${k}`} label={`${l} (opcional)`} icon={Link2}><input id={`m-${k}`} value={m.links[k]} onChange={setLink(k)} placeholder="https://" className={fieldClass} /></Field>
              ))}
              <label className="flex items-start gap-2 text-xs text-muted">
                <input type="checkbox" checked={m.terms} onChange={(e) => setM((s) => ({ ...s, terms: e.target.checked }))} className="mt-0.5 h-4 w-4 rounded border-line text-blue" />
                Li e aceito os termos de uso e a política de privacidade (LGPD).
              </label>
              <button type="submit" className="w-full rounded-md bg-graphite px-4 py-3 text-sm font-bold text-white transition hover:brightness-125">Criar conta de mentor</button>
            </>
          )}
        </form>
      </div>
      <p className="mt-5 text-center text-sm text-muted">
        É estudante?{" "}
        <button type="button" onClick={onSwitch} className="font-semibold text-blue hover:underline">Voltar ao cadastro de estudante</button>
      </p>
    </>
  );
}
