import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProjectDetail from "./pages/ProjectDetail";
import StudentDashboard from "./pages/StudentDashboard";
import NewProject from "./pages/NewProject";
import MentorPanel from "./pages/MentorPanel";
import MentorProjects from "./pages/MentorProjects";
import MentorNetwork from "./pages/MentorNetwork";
import MentorProfile from "./pages/MentorProfile";
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
import { homeFor, isLoggedIn } from "./services/api";

const STUDENT = ["student"];
const MENTOR = ["mentor"];

// Portal do Estudante: tudo, exceto o cadastro, exige estar cadastrado/logado.
function Protected({ children }) {
    useApi();
    return isLoggedIn() ? children : <Navigate to="/" replace />;
}
function Guard({ roles, children }) {
    const { user } = useApi();
    if (!isLoggedIn()) return <Navigate to="/" replace />;
    return roles.includes(user.role) ? children : <Navigate to={homeFor(user.role)} replace />;
}
function Home() {
    const { user } = useApi();
    return isLoggedIn() ? <Navigate to={homeFor(user.role)} replace /> : <Register />;
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
                <Route path="/aluno" element={<Guard roles={STUDENT}><StudentDashboard /></Guard>} />
                <Route path="/aluno/projetos" element={<Guard roles={STUDENT}><MyProjects /></Guard>} />
                <Route path="/aluno/explorar" element={<Guard roles={STUDENT}><ExploreSteam /></Guard>} />
                <Route path="/aluno/notificacoes" element={<Guard roles={STUDENT}><Notifications /></Guard>} />
                <Route path="/aluno/novo-projeto" element={<Guard roles={STUDENT}><NewProject /></Guard>} />
                <Route path="/mentor" element={<Guard roles={MENTOR}><MentorPanel /></Guard>} />
                <Route path="/mentor/projetos" element={<Guard roles={MENTOR}><MentorProjects /></Guard>} />
                <Route path="/mentor/projetos/:id" element={<Guard roles={MENTOR}><PostDetail /></Guard>} />
                <Route path="/mentor/explorar" element={<Guard roles={MENTOR}><MentorExplore /></Guard>} />
                <Route path="/mentor/conexoes" element={<Guard roles={MENTOR}><MentorNetwork /></Guard>} />
                <Route path="/mentor/chat" element={<Guard roles={MENTOR}><Chat /></Guard>} />
                <Route path="/mentor/chat/:id" element={<Guard roles={MENTOR}><Chat /></Guard>} />
                <Route path="/mentor/notificacoes" element={<Guard roles={MENTOR}><Notifications /></Guard>} />
                <Route path="/mentor/indicadores" element={<Guard roles={MENTOR}><MentorIndicators /></Guard>} />
                <Route path="/mentores/chat" element={<Navigate to="/mentor/chat" replace />} />
                <Route path="/mentores/:id" element={<Protected><MentorProfile /></Protected>} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <ChatWidget />
            <DemoBar />
        </BrowserRouter>
    );
}
