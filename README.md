# WitHub — Protótipo Web

Protótipo funcional em React do WitHub, plataforma de portfólio acadêmico STEAM.

## O que está incluído

- **Landing page** (visitante não autenticado): vitrine pública de projetos, filtros por área STEAM, tecnologia e instituição, página de detalhe de projeto com certificado digital.
- **Área do Aluno**: dashboard com projetos, status e indicadores; fluxo de "Novo Projeto" com upload, categoria STEAM, seletor de privacidade (Privado/Interno/Público) e histórico de versões.
- **Portal do Mentor**: cadastro e login próprios, painel com indicadores reais, "Meus projetos de mentoria" por etapa, avaliação (aceitar, iniciar, feedback, orientação privada, aprovar, pedir ajustes), equipe de mentoria em cada projeto, agenda, rede de mentores com chat, perfil público e notificações.

A pasta `dist/` já contém uma versão pronta (build de produção) — basta abrir com um servidor estático para visualizar sem instalar nada.

## Sistema de mentores

- **Cadastro de mentor** cria a conta de verdade (função `mentor`, senha com salt + hash em `state.credentials`) e abre a sessão; o login encaminha cada perfil à página certa (`/mentor` ou `/feed`).
- **Acesso** é checado no "servidor" simulado (`src/services/api.js`) e nas rotas (`Guard` em `App.jsx`). Um aluno que digita `/mentor` é redirecionado.
- **Vínculo projeto–mentor** (mentorias): solicitada → aceita → ativa → encerrada (ou recusada). Só mentor com mentoria aceita/ativa vê arquivos confidenciais e só mentor com mentoria ativa avalia. Ofertas e convites de mentores exigem autorização do estudante.
- **Etapas do projeto**: aguardando avaliação → em mentoria → aguardando ajustes → aprovado → publicado → concluído. Aprovar não publica: a visibilidade continua com o estudante.
- **Histórico** só cresce (nada é apagado); orientações privadas são visíveis só aos mentores do projeto.
- **Chat de mentores**: conversa individual sem duplicar, referência a projeto, não lidas e privacidade por participante.

### Rotas do mentor

`/mentor`, `/mentor/projetos`, `/mentor/projetos/:id`, `/mentor/explorar`, `/mentor/conexoes`, `/mentor/chat`, `/mentor/chat/:id`, `/mentor/notificacoes`, `/mentor/indicadores` e o perfil público `/mentores/:id`.

### Limites do protótipo

- Não existe backend: tudo fica no `localStorage` do navegador (mensagens, contas, mentorias). Para produção, cada função de `api.js` precisa virar um endpoint com as mesmas regras, hash de senha no servidor (bcrypt/argon2), sessão real e tempo real para o chat.
- Os mentores `u-marcelo`, `u-renata` e `u-andre` e as mentorias iniciais dos projetos de exemplo são dados de demonstração (use `?demo` na URL para trocar de usuário).
- Contas de demonstração não entram pelo formulário de login.
- Testes: `node tests/permissions.test.mjs`.

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
