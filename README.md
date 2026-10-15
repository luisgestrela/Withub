# WitHub — Protótipo Web

Protótipo funcional em React do WitHub, plataforma de portfólio acadêmico STEAM.

## O que está incluído

- **Landing page** (visitante não autenticado): vitrine pública de projetos, filtros por área STEAM, tecnologia e instituição, página de detalhe de projeto com certificado digital.
- **Área do Aluno**: dashboard com projetos, status e indicadores; fluxo de "Novo Projeto" com upload, categoria STEAM, seletor de privacidade (Privado/Interno/Público) e histórico de versões.
- **Painel do Mentor**: fila de validação com ações de Aprovar/Ajustes/Comentar, exploração de projetos da instituição, histórico de avaliações e indicadores.

A pasta `dist/` já contém uma versão pronta (build de produção) — basta abrir com um servidor estático para visualizar sem instalar nada.

## Novidades desta versão

- **Cadastro com dois portais**: estudante e mentor trocam de lugar com painéis deslizando (respeita `prefers-reduced-motion`; no celular só os formulários se alternam). Os dados digitados são preservados ao alternar.
- **Cadastro de mentor = solicitação**: não cria sessão nem libera acesso (mentores veem arquivos confidenciais); a solicitação fica pendente para validação.
- **Visibilidade "Interno"** funcional (estudantes da mesma instituição) e seletor de visibilidade no detalhe do projeto.
- Busca do cabeçalho filtra o feed; notificações lidas persistem e geram contador; painel com acesso rápido e atividade recente; prévia ao criar projeto.
- Removidos itens decorativos/fictícios do formulário de projeto (equipe e histórico de progresso fixos).
- O "backend" continua simulado em `src/services/api.js` (localStorage). Testes: `node tests/permissions.test.mjs`.

## Rodar em modo desenvolvimento

```bash
npm install
npm run dev
```

Acesse o endereço mostrado no terminal (geralmente http://localhost:5173).

## Gerar novo build de produção

```bash
npm run build
npm run preview
```

## Visualizar o build já incluso (sem instalar dependências)

```bash
npx serve dist
```

## Stack

- React 19 + Vite
- React Router
- Tailwind CSS
- lucide-react (ícones)

## Estrutura

```
src/
  assets/        logo da marca
  components/    Header, Footer, cards, badges, layout autenticado
  data/          dados mockados de projetos, fila de validação etc.
  pages/         Landing, ProjectDetail, StudentDashboard, NewProject, MentorPanel
```

## Próximos passos sugeridos

- Conectar aos endpoints reais de autenticação e upload de arquivos.
- Implementar o gerador real de certificado em PDF + QR code (RF12).
- Adicionar a tela de indicadores completos do gestor institucional (RF18).
