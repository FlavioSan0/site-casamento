# Migração completa para a V2

## Onde o desenvolvimento havia parado

A V2 já possuía a base em Next.js, Supabase e painel modular. A seção **Nossa História** estava criada no banco, nas APIs e no componente administrativo, porém ainda não estava ligada à página pública nem à tela de Layout. Também existia incompatibilidade entre os campos de presentes usados na interface e os campos gravados no banco, o que impedia reservas corretas.

## O que foi migrado e corrigido

- informações do evento, cerimônia e recepção;
- links de localização com fallback seguro por endereço;
- contagem regressiva e hero;
- Nossa História, galeria e direção visual;
- dress code;
- RSVP com limite configurável, nomes dos acompanhantes e prazo;
- lista de presentes, cotas e reservas;
- PIX e QR Code;
- painel de visão geral, configurações, convidados, financeiro e layout;
- consulta e remoção de reservas no painel;
- autenticação obrigatória nas páginas e rotas administrativas;
- RLS, bucket de mídia e funções atômicas de reserva no Supabase.

## Passos obrigatórios

1. Faça um backup do banco atual no Supabase.
2. Abra **SQL Editor** no mesmo projeto Supabase usado pela V1.
3. Execute integralmente `supabase/migrations/20260728_v2_full_migration.sql`.
4. Copie `.env.example` para `.env.local` e preencha todas as variáveis. Em `ADMIN_EMAILS`, informe os e-mails autorizados, separados por vírgula.
5. Confirme em **Authentication > Users** que o usuário administrador existe.
6. Execute `npm install`, `npm run build` e depois publique na Vercel.
7. Teste no celular os dois botões de localização, o RSVP, uma reserva e a remoção dessa reserva no painel.

## Localizações

Os botões não dependem mais de um link manual perfeito. Quando o campo contém apenas um endereço, está vazio ou aponta genericamente para a página inicial do Maps, a aplicação cria uma busca no Google Maps com o endereço cadastrado. O painel também mostra um botão para testar cada destino antes de salvar/publicar.

## Segurança

`SUPABASE_SERVICE_ROLE_KEY` deve existir apenas no servidor/Vercel. Nunca use essa chave em variável `NEXT_PUBLIC_*`, arquivo versionado ou código do navegador.
