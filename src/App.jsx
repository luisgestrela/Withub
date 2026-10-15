import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProjectDetail from "./pages/ProjectDetail";
import StudentDashboard from "./pages/StudentDashboard";
import NewProject from "./pages/NewProject";
import MentorPanel from "./pages/MentorPanel";
import Register from "./pages/Register";
import MentorIndicators from "./pages/MentorIndicators";
import Feed from "./pages/Feed";
import MyProjects from "./pages/MyProjects";
import ExploreSteam from "./pages/ExploreSteam";
import Notifications from "./pages/Notifications";
import MentorExplore from "./pages/MentorExplore";
import PostDetail from "./pages/PostDetail";
import Chat from "./pages/Chat";
import ChatWidget from "./components/ChatWidget";
import DemoBar from "./components/DemoBar";
import { useApi } from "./services/useApi";
import { isLoggedIn } from "./services/api";

// Portal do Estudante: tudo, exceto o cadastro, exige estar cadastrado/logado.
function Protected({ children }) {
    useApi();
    return isLoggedIn() ? children : <Navigate to="/" replace />;
}
function Home() {
    useApi();
    return isLoggedIn() ? <Navigate to="/feed" replace /> : <Register />;
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/cadastro" element={<Navigate to="/" replace />} />
                <Route path="/feed" element={<Protected><Feed /></Protected>} />
                <Route path="/publicacao/:id" element={<Protected><PostDetail /></Protected>} />
                <Route path="/projeto/:id" element={<Protected><ProjectDetail /></Protected>} />
                <Route path="/aluno" element={<Protected><StudentDashboard /></Protected>} />
                <Route path="/aluno/projetos" element={<Protected><MyProjects /></Protected>} />
                <Route path="/aluno/explorar" element={<Protected><ExploreSteam /></Protected>} />
                <Route path="/aluno/notificacoes" element={<Protected><Notifications /></Protected>} />
                <Route path="/aluno/novo-projeto" element={<Protected><NewProject /></Protected>} />
                {/* Portal do mentor/docente: será integrado em uma próxima etapa */}
                <Route path="/mentor" element={<MentorPanel />} />
                <Route path="/mentor/explorar" element={<MentorExplore />} />
                <Route path="/mentor/indicadores" element={<MentorIndicators />} />
                <Route path="/mentores/chat" element={<Chat />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <ChatWidget />
            <DemoBar />
        </BrowserRouter>
    );
}
