import SocialShell from "../components/SocialShell";
import ChatPanel from "../components/ChatPanel";

export default function Chat() {
  return (
    <SocialShell>
      <h1 className="mb-4 text-xl font-bold text-ink">Chat dos mentores</h1>
      <ChatPanel />
    </SocialShell>
  );
}
