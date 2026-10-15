import SocialShell from "../components/SocialShell";
import FeedList from "../components/FeedList";
import WelcomeBanner from "../components/WelcomeBanner";

export { Chips } from "../components/FeedList";

export default function Feed() {
  return (
    <SocialShell>
      <WelcomeBanner />
      <div className="mx-auto mb-4 max-w-2xl">
        <h2 className="text-lg font-bold text-ink">Feed da comunidade</h2>
        <p className="text-sm text-muted">Projetos públicos de outros estudantes. Materiais confidenciais nunca aparecem aqui.</p>
      </div>
      <FeedList />
    </SocialShell>
  );
}
