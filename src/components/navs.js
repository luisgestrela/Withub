import { Newspaper, LayoutDashboard, FolderGit2, Compass, Bell, Plus, BarChart3, MessageSquare, Users, User } from "lucide-react";

export const studentNav = [
  { to: "/feed", label: "Feed", icon: Newspaper },
  { to: "/aluno", label: "Meu Painel", icon: LayoutDashboard },
  { to: "/aluno/projetos", label: "Meus Projetos", icon: FolderGit2 },
  { to: "/aluno/explorar", label: "Explorar STEAM", icon: Compass },
  { to: "/aluno/notificacoes", label: "Notificações", icon: Bell },
  { to: "/aluno/novo-projeto", label: "Publicar projeto", icon: Plus },
];
export const mentorNavFor = (id) => [
  { to: "/mentor", label: "Início", icon: LayoutDashboard },
  { to: "/feed", label: "Feed", icon: Newspaper },
  { to: "/mentor/projetos", label: "Meus projetos", icon: FolderGit2 },
  { to: "/mentor/explorar", label: "Explorar projetos", icon: Compass },
  { to: "/mentor/conexoes", label: "Conexões", icon: Users },
  { to: "/mentor/chat", label: "Mensagens", icon: MessageSquare, badge: "messages" },
  { to: "/mentor/notificacoes", label: "Notificações", icon: Bell, badge: "notifications" },
  { to: "/mentor/indicadores", label: "Indicadores", icon: BarChart3 },
  { to: `/mentores/${id}`, label: "Perfil", icon: User },
];
