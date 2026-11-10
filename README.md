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
