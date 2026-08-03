# Relacionamento de reservas e confirmações — 03/08/2026

## Problema corrigido

Reservas antigas sem telefone eram relacionadas apenas quando o nome normalizado era exatamente igual ao nome do RSVP. Isso deixava pendentes casos como:

- nome abreviado: `Emerson Rodrigues` x `Emerson Rodrigues da Silva`;
- sobrenome usado isoladamente: `Pontes`;
- apelido ou primeiro nome usado isoladamente: `Calixto`, `Rubi`;
- reserva realizada em nome de acompanhante.

## Nova estratégia automática

A correspondência agora usa esta prioridade:

1. nome completo exato;
2. conjunto de nomes abreviado contido em um único nome completo;
3. palavra única com pelo menos quatro caracteres, quando pertence a uma única confirmação no evento;
4. nomes de acompanhantes também participam da busca.

Empates permanecem pendentes para evitar vínculos incorretos.

## Correção manual no painel

Reservas ainda pendentes agora exibem um seletor de confirmação e o botão `Relacionar reserva`. O vínculo manual é salvo como `vinculo_origem = 'manual'`.

## Migration

Executar no Supabase, depois das migrations anteriores:

`supabase/migrations/20260803_improve_reservation_name_matching.sql`

A migration não cria novas colunas. Ela substitui a função de relacionamento por nome e reprocessa somente reservas ainda pendentes.
