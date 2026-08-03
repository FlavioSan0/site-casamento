# Atualização mobile do painel do casal — 03/08/2026

## Entrega

- menu inferior fixo com cinco áreas principais;
- indicação clara da seção ativa;
- suporte a safe area em celulares com notch;
- cabeçalho mobile compacto com acesso ao convite e saída;
- conteúdo protegido contra sobreposição do menu inferior;
- métricas em grade compacta de duas colunas;
- atalhos em grade 2 × 2;
- cards de convidados, reservas, presentes e layout reorganizados;
- filtros com rolagem horizontal;
- formulários em coluna única e inputs com 16 px;
- barra de salvamento posicionada acima do menu inferior;
- modais convertidos em bottom sheet no celular;
- preview de mensagens e imagens otimizado;
- ações principais com áreas de toque adequadas;
- breakpoints específicos para 390 px e telas menores.

## Arquivos principais

- `src/components/admin/admin-shell.tsx`
- `src/components/admin/admin-shell.module.css`
- `src/app/globals.css`
- `test/admin-mobile-ui.test.mjs`

## Banco de dados

Nenhuma migration ou alteração no Supabase é necessária.
