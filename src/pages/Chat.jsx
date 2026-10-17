import { useParams } from "react-router-dom";
import SocialShell from "../components/SocialShell";
import ChatPanel from "../components/ChatPanel";

export default function Chat() {
  const { id } = useParams();
  return (
    <SocialShell>
      <h1 className="mb-4 text-xl font-bold text-ink">Mensagens</h1>
      <ChatPanel initialId={id || null} />
    </SocialShell>
  );
}

