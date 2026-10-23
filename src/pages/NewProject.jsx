import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, Lock, Building2, Globe2, FileText, X, UserCheck } from "lucide-react";
import SocialShell from "../components/SocialShell";
import Notice from "../components/Notice";
import RecommendedNotice from "../components/RecommendedNotice";
import CategoryChip from "../components/CategoryChip";
import { Chips } from "../components/FeedList";
import { categories } from "../data/projects";
import { useApi } from "../services/useApi";
import * as api from "../services/api";


const visibilityOptions = [
  { id: "private", label: "Privado", desc: "Visível apenas para você.", icon: Lock },
  { id: "internal", label: "Interno", desc: "Visível apenas para estudantes e mentores da sua instituição.", icon: Building2 },
  { id: "public", label: "Público", desc: "Visível no feed para toda a comunidade. Só é publicado com o aval do mentor.", icon: Globe2 },
];

export default function NewProject() {
  const [visibility, setVisibility] = useState("private");
  const [category, setCategory] = useState("engineering");
  const [mentorId, setMentorId] = useState("");
  const mentors = api.listMentors();
  // Arquivos confidenciais são opcionais: a lista pode ficar vazia e o envio não é bloqueado.
  const [restrictedFiles, setRestrictedFiles] = useState([]);
  const restrictedInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useApi();
  const [form, setForm] = useState({ title: "", description: "", skills: "", knowledge: "", tech: "" });
  const [images, setImages] = useState([]); // { name, dataUrl }
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addImages = async (fileList) => {
    const files = Array.from(fileList || []);
    const errs = files.map((f) => api.validateFile("image", f)).filter(Boolean);
    if (errs.length) setNotice({ type: "err", text: errs.join(" ") });
    const ok = files.filter((f) => !api.validateFile("image", f));
    const read = (f) => new Promise((res) => { const r = new FileReader(); r.onload = () => res({ name: f.name, dataUrl: r.result }); r.readAsDataURL(f); });
    const loaded = await Promise.all(ok.map(read));
    setImages((prev) => [...prev, ...loaded].slice(0, 12));
  };

  const submit = (asDraft) => {
    setBusy(true);
    try {
      const id = api.createProject({
        ...form, skills: api.parseList(form.skills), knowledge: api.parseList(form.knowledge), tech: api.parseList(form.tech),
        category, images: images.map((i) => i.dataUrl), visibility: asDraft ? "private" : visibility, mentorId: asDraft ? "" : mentorId,
      }, restrictedFiles); // arquivos confidenciais são opcionais: lista vazia é válida
      navigate(`/publicacao/${id}`, { state: { created: true } });
    } catch (e) {
      setNotice({ type: "err", text: e.message });
      setBusy(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const addRestrictedFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    setRestrictedFiles((prev) => [...prev, ...incoming]);
  };
  const removeRestrictedFile = (index) =>
    setRestrictedFiles((prev) => prev.filter((_, i) => i !== index));

  return (
    <SocialShell>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink">Novo Projeto Acadêmico</h1>
        <p className="mt-1 text-sm text-muted">Estruture seu projeto para curadoria do mentor e futura publicação.</p>
      </div>

      <Notice notice={notice} />
      {user.role !== "student" && (
        <Notice notice={{ type: "err", text: "Apenas estudantes podem publicar projetos. Troque para o perfil de estudante na barra de simulação." }} />
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Section title="Informações gerais">
            <Field label="Título do projeto">
              <input
                type="text"
                placeholder="Ex.: Rover Explorador Autônomo com LiDAR"
                value={form.title}
                onChange={set("title")}
                className="input"
              />
            </Field>
            <Field label="Descrição do projeto">
              <textarea
                rows={4}
                placeholder="Descreva objetivo, problema que resolve, desenvolvimento e resultados…"
                value={form.description}
                onChange={set("description")}
                className="input resize-none"
              />
            </Field>
            <Field label="Categoria STEAM">
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      category === c.id ? "border-transparent text-white" : "border-line-soft text-muted hover:border-line"
                    }`}
                    style={category === c.id ? { backgroundColor: c.color } : {}}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </Field>
          </Section>

          <Section title="Imagens do projeto (públicas)">
            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
              onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line py-8 text-center">
              <UploadCloud className="h-6 w-6 text-muted" />
              <p className="text-sm font-medium text-ink">Resultado final, protótipos e etapas que podem ser compartilhadas</p>
              <p className="text-xs text-muted">JPG, PNG ou WEBP até 2 MB. A primeira imagem será a capa. Aparecem para todos.</p>
              <button type="button" onClick={() => imageInputRef.current?.click()} className="mt-1 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-blue hover:text-blue">
                Selecionar imagens
              </button>
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img.dataUrl} alt={img.name} className="h-20 w-full rounded-md object-cover" />
                    <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))} aria-label={`Remover ${img.name}`} className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-ink"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Skills, conhecimentos e tecnologias (públicos)">
            <Field label="Skills desenvolvidas (separe por vírgula)">
              <input type="text" className="input" placeholder="Ex.: Trabalho em equipe, Modelagem 3D" value={form.skills} onChange={set("skills")} />
            </Field>
            <Field label="Conhecimentos adquiridos">
              <input type="text" className="input" placeholder="Ex.: Fusão de sensores, Cinemática" value={form.knowledge} onChange={set("knowledge")} />
            </Field>
            <Field label="Tecnologias, ferramentas e equipamentos">
              <input type="text" className="input" placeholder="Ex.: Python, ROS, Impressora 3D" value={form.tech} onChange={set("tech")} />
            </Field>
          </Section>

          <Section title="Mentor responsável">
            <p className="text-xs text-muted">
              Vincule o projeto a um mentor. Ele recebe o projeto na aba “Meus projetos”, aceita o vínculo, dá feedbacks, pode pedir modificações e é quem publica o projeto no feed quando estiver pronto.
            </p>
            <Field label={visibility === "public" ? "Mentor (obrigatório para publicar no feed)" : "Mentor (opcional)"}>
              <select className="input" value={mentorId} onChange={(e) => setMentorId(e.target.value)} aria-label="Mentor responsável">
                <option value="">Escolher depois</option>
                {mentors.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.specialties.slice(0, 2).join(", ")}</option>)}
              </select>
            </Field>
            {visibility === "public" && !mentorId && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-review"><UserCheck className="h-3.5 w-3.5" /> Escolha um mentor: o projeto só entra no feed depois que ele publicar.</p>
            )}
          </Section>

          <Section title="Arquivos confidenciais (opcional)">
            <p className="-mt-2 flex items-start gap-1.5 text-xs font-semibold text-violet"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Acesso restrito: apenas empresas parceiras com recrutadores e a própria instituição podem acessar estes arquivos.</p>
            <RecommendedNotice />

            <p className="text-xs text-muted">
              Modelagem, desenhos técnicos, arquivos de fabricação e confecção, modelos editáveis e documentação técnica.
              Ficam fora da vitrine pública. O envio não é obrigatório.
            </p>

            <input
              ref={restrictedInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                addRestrictedFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line py-8 text-center">
              <Lock className="h-6 w-6 text-muted" />
              <p className="text-sm font-medium text-ink">Arquivos restritos (empresas parceiras e instituição)</p>
              <button
                type="button"
                onClick={() => restrictedInputRef.current?.click()}
                className="mt-1 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-blue hover:text-blue"
              >
                Selecionar arquivos confidenciais
              </button>
            </div>

            {restrictedFiles.length > 0 && (
              <ul className="space-y-2">
                {restrictedFiles.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-md border border-line-soft px-3 py-2">
                    <FileText className="h-4 w-4 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate text-xs text-ink">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeRestrictedFile(i)}
                      aria-label={`Remover ${f.name}`}
                      className="rounded p-1 text-muted hover:bg-cloud hover:text-ink"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Privacidade">
            <div className="space-y-2">
              {visibilityOptions.map((opt) => {
                const Icon = opt.icon;
                const active = visibility === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setVisibility(opt.id)}
                    className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                      active ? "border-blue bg-blue-50" : "border-line-soft hover:border-line"
                    }`}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-blue" : "text-muted"}`} />
                    <div>
                      <p className={`text-sm font-semibold ${active ? "text-blue" : "text-ink"}`}>{opt.label}</p>
                      <p className="text-xs text-muted">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Prévia">
            <div className="overflow-hidden rounded-lg border border-line-soft">
              {images[0] ? <img src={images[0].dataUrl} alt="" className="h-28 w-full object-cover" /> : <div className="h-20 bg-gradient-to-br from-[#0B5FFF] to-[#101820]" />}
              <div className="space-y-2 p-3">
                <CategoryChip id={category} />
                <p className={`text-sm font-bold ${form.title.trim() ? "text-ink" : "text-muted"}`}>{form.title.trim() || "Título do projeto"}</p>
                <p className={`line-clamp-3 text-xs ${form.description.trim() ? "text-ink" : "text-muted"}`}>{form.description.trim() || "A descrição aparece aqui."}</p>
                <Chips items={api.parseList(form.skills)} tone="bg-blue-50 text-blue" />
                <Chips items={api.parseList(form.tech)} />
              </div>
            </div>
          </Section>

          <div className="rounded-xl border border-line-soft bg-white p-5 shadow-card">
            <p className="text-xs text-muted">
              Imagens, descrição, skills e tecnologias são públicos depois da publicação. Arquivos confidenciais só são acessíveis a empresas parceiras com recrutadores e à instituição. Ao criar o projeto, uma licença provisória é gerada automaticamente.
            </p>
            <button disabled={busy || user.role !== "student"} onClick={() => submit(false)} className="mt-4 w-full rounded-md bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50">
              {busy ? "Salvando…" : { public: "Enviar ao mentor para publicação", internal: "Publicar para minha instituição", private: "Salvar projeto privado" }[visibility]}
            </button>
            <button disabled={busy || user.role !== "student"} onClick={() => submit(true)} className="mt-2 w-full rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:border-line disabled:opacity-50">
              Salvar como rascunho
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #D7DCE3;
          padding: 0.55rem 0.75rem;
          font-size: 0.875rem;
          color: #0D1117;
        }
        .input:focus {
          outline: none;
          border-color: #0B5FFF;
          box-shadow: 0 0 0 3px #EDF3FF;
        }
      `}</style>
    </SocialShell>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-line-soft bg-white p-5 shadow-card">
      <h2 className="mb-4 text-sm font-bold text-ink">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}
