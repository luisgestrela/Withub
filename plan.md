# Plano: dashboard do mentor

## Objetivo
Corrigir o carregamento do painel do mentor e transformar `/mentor` em uma visão operacional com tarefas pendentes, agenda, distribuição por etapa, tabela de projetos e atividade recente, preservando o visual e as permissões existentes.

## Decisões
- Corrigir `loadMentorDashboardFromDatabase` sem alteração de schema ou dados.
- Reutilizar as tabelas/views existentes (`mentorships`, `project_feed`, `project_meetings`, `project_history_feed`, `notifications`, `conversation_inbox`).
- Adicionar métricas derivadas no serviço e gráficos SVG/CSS sem nova dependência.
- Manter os indicadores detalhados em `/mentor/indicadores`, usando o dashboard inicial para priorização de trabalho.

## Estrutura
- `src/services/database.js`: consulta consolidada e correção de vínculos.
- `src/pages/MentorPanel.jsx`: layout do dashboard, cards, ações, tabela e gráficos.
- `src/components/StatCard.jsx`: componente reutilizado para os cards.
- `public/manus-routes.json`: manifesto das rotas existentes.

## Critérios
- Mentor sem projetos não recebe erro.
- Solicitações, ofertas e reuniões continuam visíveis.
- O painel exibe itens que exigem ação, status dos projetos, agenda e atividade.
- O build, lint e testes existentes passam após a alteração.
