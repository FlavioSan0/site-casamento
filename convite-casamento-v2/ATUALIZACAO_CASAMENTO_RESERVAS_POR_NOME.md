# Casamento de reservas antigas por nome

Esta atualização cobre reservas criadas antes de o telefone ser obrigatório.

## Regra de vínculo

A prioridade continua sendo:

1. `evento_id + telefone_normalizado`;
2. nome normalizado do responsável pela reserva;
3. nome normalizado de um acompanhante informado no RSVP.

O nome é comparado sem diferença de maiúsculas, acentos, hífens, apóstrofos ou espaços duplicados.

Exemplo:

- `Jéssica da Silva`;
- `jessica  da-silva`;
- `JESSICA DA SILVA`.

Os três valores são tratados como `jessica da silva`.

## Proteção contra associação incorreta

O vínculo automático por nome só acontece quando o nome aponta para uma única confirmação dentro do mesmo evento.

Se existirem duas confirmações compatíveis, como duas pessoas chamadas `Jessica`, a reserva permanece pendente. O sistema não escolhe uma delas automaticamente.

## Migration obrigatória

Execute no SQL Editor do Supabase o conteúdo de:

```text
supabase/migrations/20260801_match_legacy_reservations_by_name.sql
```

A migration:

- adiciona `nome_normalizado` às confirmações e reservas;
- adiciona `vinculo_origem` às reservas;
- cria triggers de normalização;
- relaciona reservas antigas pelo nome principal ou acompanhante;
- marca a origem como `telefone`, `nome` ou `manual`;
- mantém homônimos pendentes para revisão;
- não apaga registros.

## Conferência após a migration

```sql
select
  r.id,
  r.reservado_por,
  r.nome_normalizado,
  r.confirmacao_id,
  r.vinculo_origem,
  p.nome as presente
from public.reservas_presentes r
left join public.presentes p on p.id = r.presente_id
order by r.created_at desc;
```

Reservas ainda pendentes:

```sql
select
  r.id,
  r.reservado_por,
  r.nome_normalizado,
  p.nome as presente
from public.reservas_presentes r
left join public.presentes p on p.id = r.presente_id
where r.confirmacao_id is null
order by r.created_at desc;
```

## Comportamento futuro

Quando uma confirmação nova for enviada, o sistema:

- procura primeiro pelo telefone;
- pode reaproveitar uma confirmação antiga sem telefone quando houver um único nome exato;
- relaciona reservas órfãs pelo nome do convidado principal ou de acompanhante;
- mantém casos ambíguos sem associação automática.
