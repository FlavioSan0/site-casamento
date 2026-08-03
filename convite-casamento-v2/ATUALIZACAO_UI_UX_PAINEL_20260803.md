# Atualização de UI/UX do painel do casal

## Escopo

- navegação lateral mais compacta e contextual;
- cabeçalho do evento reduzido e com acesso rápido ao convite;
- navegação horizontal no tablet e celular;
- cartões, métricas, formulários, filtros e modais padronizados;
- cards de convidados e reservas mais densos e legíveis;
- ações reorganizadas para telas pequenas;
- dashboard simplificado para reduzir repetição e rolagem;
- tela de login alinhada ao novo sistema visual.

## Arquivos principais

- `src/components/admin/admin-shell.tsx`
- `src/components/admin/admin-shell.module.css`
- `src/components/admin/admin-logout-button.tsx`
- `src/components/admin/admin-section-header.module.css`
- `src/app/admin/eventos/[slug]/page.tsx`
- `src/app/globals.css`

## Banco e integrações

Esta atualização é exclusivamente visual e estrutural no frontend. Não exige migration e não altera Supabase, reservas, confirmações, mensagens ou presentes.

## Validação

- testes automatizados: 27/27 aprovados;
- `npm ci`: não executado por indisponibilidade de pacote no registro interno do ambiente;
- lint, typecheck e build devem ser executados localmente antes do push.
