# Supabase: revisão e integração

## Estado da aplicação

Os módulos de cadastro/login usam Supabase Auth e os RPCs `register_student` e `register_mentor`. A camada de serviço foi reduzida a operações remotas; não mantém um banco de aplicação em `localStorage` nem carrega usuários/projetos de demonstração.

| Fluxo | Persistência |
| --- | --- |
| Perfis e autenticação | Supabase Auth, `profiles`, `mentor_profiles`, consentimentos |
| Explorar, feed, projetos próprios e métricas do aluno | `project_feed`, tabelas associadas |
| Criar/editar/excluir projeto | RPC `create_project`, tabelas de projetos/tags, RPCs de atualização e exclusão lógica |
| Imagens e arquivos restritos | Buckets `withub-project-media` e `withub-project-files` e suas tabelas de metadados |
| Curtidas, comentários e reposts | `project_likes`, `project_comments`, `project_reposts` |
| Mentoria, decisões, histórico e agenda | RPCs e tabelas de mentoria/histórico/reuniões |
| Chat e notificações | `conversations`, `messages`, `notifications` e RPCs |

As operações de leitura usam views e consultas sujeitas às políticas RLS. Mudanças de estado do fluxo de mentoria/chat chamam RPCs; a `secret key` não é usada pelo cliente.

## Revisão do SQL

O esquema cobre os recursos centrais e inclui Auth, perfis, consentimento, projetos, tags, colaboradores, mídias, arquivos restritos, licenças, mentorias, histórico, reuniões, feed social, notificações, conversas, mensagens, RLS, RPCs e buckets privados.

Antes de produção, ainda recomendo:

1. **Aprovação de mentores:** `register_mentor` permite que uma conta conclua o próprio cadastro como mentor. Se a instituição precisa aprovar mentores, altere o fluxo para criar um pedido pendente.
2. **Verificação das views públicas:** confirme em staging as colunas de `mentor_directory`, `project_feed`, `project_comment_feed`, `project_team` e feeds de histórico, especialmente após alterações futuras no esquema.
3. **Arquivos órfãos:** o PostgreSQL e o Storage não compartilham transação. Se uma chamada de limpeza falhar, confira e remova objetos órfãos seguindo as políticas do bucket.
4. **Histórico de migrações:** `schema.sql` é uma instalação inicial. Para evoluções, mantenha migrations incrementais e aplique primeiro em staging.

## Dados anteriores e sessão

Não removi nem alterei dados existentes no Supabase. Os dados de demonstração do protótipo eram listas no código/localStorage e não foram importados; usuários antigos do mock precisarão criar/usar contas Supabase. Entradas antigas que eventualmente ainda estejam no `localStorage` do navegador não são lidas pelo WitHub.

O Supabase Auth mantém o token de sessão no armazenamento do navegador por padrão. Esse armazenamento é somente a sessão de autenticação; os dados do WitHub são consultados e gravados no Supabase. Desativar a persistência da sessão faria o usuário sair ao recarregar a página.
