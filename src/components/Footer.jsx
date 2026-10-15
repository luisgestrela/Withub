import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="border-t border-line-soft bg-white">
      <div className="mx-auto max-w-content px-5 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              Portal do Estudante WitHub: publique seus projetos STEAM, monte seu portfólio e
              interaja com a comunidade.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink">Institucional</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><a className="hover:text-blue" href="#">Sobre o WitHub</a></li>
              <li><a className="hover:text-blue" href="#">Estatuto Digital da Criança e do Adolescente</a></li>
              <li><a className="hover:text-blue" href="#">LGPD e Termos</a></li>
              <li><a className="hover:text-blue" href="#">Contato</a></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink">Para o estudante</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><a className="hover:text-blue" href="#">Como publicar um projeto</a></li>
              <li><a className="hover:text-blue" href="#">Arquivos confidenciais</a></li>
              <li><a className="hover:text-blue" href="#">Dúvidas frequentes</a></li>
              <li><a className="hover:text-blue" href="#">Suporte</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-line-soft pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 WitHub Academic Portfolios S.A. Todos os direitos reservados.</span>
          <span>Desenvolvido sob rigor técnico acadêmico.</span>
        </div>
      </div>
    </footer>
  );
}
