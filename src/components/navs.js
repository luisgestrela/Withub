import { Newspaper, LayoutDashboard, FolderGit2, Compass, Bell, Plus, ClipboardCheck, BarChart3 } from "lucide-react";

// Menu do Portal do Estudante
export const studentNav = [
  { to: "/feed", label: "Feed", icon: Newspaper },
  { to: "/aluno", label: "Meu Painel", icon: LayoutDashboard },
  { to: "/aluno/projetos", label: "Meus Projetos", icon: FolderGit2 },
  { to: "/aluno/explorar", label: "Explorar STEAM", icon: Compass },
  { to: "/aluno/notificacoes", label: "Notificações", icon: Bell },
  { to: "/aluno/novo-projeto", label: "Publicar projeto", icon: Plus },
];
export const mentorNav = [
  { to: "/mentor", label: "Fila de Validação", icon: ClipboardCheck },
  { to: "/mentor/explorar", label: "Explorar Instituição", icon: Compass },
  { to: "/mentor/indicadores", label: "Indicadores", icon: BarChart3 },
];
