# WitHub

Aplicação React/Vite conectada ao Supabase. Autenticação usa Supabase Auth; dados de perfis, projetos, feed, comentários, mentorias, reuniões, notificações e chat usam PostgreSQL/RPCs com RLS; imagens e arquivos usam Supabase Storage.

## Configuração local

O projeto já inclui `.env` local com as credenciais fornecidas. Esse arquivo é ignorado pelo Git. O navegador recebe somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`; `SUPABASE_SECRET_KEY` nunca é importada pelo frontend.

```bash
npm install
npm run dev
```

Reinicie o Vite ao alterar o `.env`. A chave secreta só pode ser usada por um backend confiável.

## Banco

O esquema aplicado está versionado em [`supabase/schema.sql`](./supabase/schema.sql). Ele cria o esquema inicial e não importa as antigas contas ou projetos de demonstração. O código não apaga registros do Supabase. Os dados de exemplo que antes eram gerados no navegador foram removidos; as categorias STEAM continuam como dados de referência.

Leia [`MIGRACAO_SUPABASE.md`](./MIGRACAO_SUPABASE.md) para a revisão do esquema, detalhes de segurança e limites conhecidos.

## Build

```bash
npm run build
npm run preview
```

## Backend (`server/`)

API Express que fica entre o frontend e o Supabase. Valida o token de login via JWKS e oferece:

| Rota | O que faz |
| --- | --- |
| `GET /health` | Health check do Render |
| `GET /api/feed` | Feed público em uma chamada, com cache de 30 s e URLs de imagem assinadas em lote |
| `GET /api/mentors` | Diretório de mentores com cache de 60 s |
| `GET /api/projects/:id/files/:fileId/download` | Confere a permissão (RLS) e assina o download de arquivo restrito |

Se `VITE_API_URL` não estiver definido, ou a API estiver fora do ar, o frontend volta a falar direto com o Supabase.

```bash
cd server && npm install && npm run dev   # API em http://localhost:3000
npm test                                   # testes de auth/CORS
```

## Deploy no Render

1. Suba o projeto (com `render.yaml` na raiz) para o GitHub.
2. Render → **New → Blueprint** → escolha o repositório. Serão criados `withub-api` e `withub-web`.
3. Preencha as variáveis marcadas como secretas (veja `.env.example`). `ALLOWED_ORIGINS` = URL do `withub-web`; `VITE_API_URL` = URL do `withub-api`.
4. No Supabase → Authentication → URL Configuration, adicione a URL do `withub-web` em *Site URL* / *Redirect URLs*.

No plano gratuito a API "dorme" após ~15 min sem uso e leva cerca de 30–60 s para acordar; nesse intervalo o frontend usa o Supabase direto (fallback), mas o `fresh` do cache só volta quando a API estiver ativa.
