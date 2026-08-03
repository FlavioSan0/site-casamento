-- Amplia o relacionamento de reservas antigas por nome sem sacrificar segurança.
-- Prioridade:
-- 1. nome completo exato;
-- 2. nome abreviado contido em um único nome completo;
-- 3. sobrenome/apelido de uma palavra, com ao menos 4 caracteres, único no evento.
-- Empates continuam pendentes para revisão manual no painel.

begin;

create or replace function public.tokens_nome_convidado(p_nome text)
returns text[]
language sql
immutable
as $$
  select coalesce(
    array_agg(token order by ordinalidade),
    array[]::text[]
  )
  from unnest(
    regexp_split_to_array(public.normalizar_nome_convidado(p_nome), '\s+')
  ) with ordinality as partes(token, ordinalidade)
  where length(token) >= 2
    and token not in ('da', 'das', 'de', 'do', 'dos', 'e');
$$;

create or replace function public.relacionar_reservas_legadas_por_nome(
  p_evento_id bigint
)
returns table (
  reservas_relacionadas integer,
  reservas_ambiguas integer,
  reservas_pendentes integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_relacionadas integer := 0;
  v_ambiguas integer := 0;
  v_pendentes integer := 0;
begin
  with nomes_confirmacao as (
    select
      c.evento_id,
      c.id as confirmacao_id,
      c.nome as nome_candidato,
      public.normalizar_nome_convidado(c.nome) as nome_normalizado,
      public.tokens_nome_convidado(c.nome) as tokens
    from public.confirmacoes c
    where c.evento_id = p_evento_id

    union all

    select
      c.evento_id,
      c.id as confirmacao_id,
      acompanhante.nome as nome_candidato,
      public.normalizar_nome_convidado(acompanhante.nome) as nome_normalizado,
      public.tokens_nome_convidado(acompanhante.nome) as tokens
    from public.confirmacoes c
    cross join lateral jsonb_array_elements_text(
      case
        when jsonb_typeof(c.nomes_acompanhantes) = 'array'
          then c.nomes_acompanhantes
        else '[]'::jsonb
      end
    ) as acompanhante(nome)
    where c.evento_id = p_evento_id
  ), candidatos_validos as (
    select distinct
      evento_id,
      confirmacao_id,
      nome_candidato,
      nome_normalizado,
      tokens
    from nomes_confirmacao
    where length(nome_normalizado) >= 3
      and cardinality(tokens) > 0
      and nome_normalizado not in ('reserva migrada', 'nao informado', 'sem nome')
  ), reservas_pendentes as (
    select
      r.id as reserva_id,
      r.evento_id,
      r.nome_normalizado,
      public.tokens_nome_convidado(r.reservado_por) as tokens
    from public.reservas_presentes r
    where r.evento_id = p_evento_id
      and r.confirmacao_id is null
      and length(coalesce(r.nome_normalizado, '')) >= 3
  ), correspondencias as (
    select
      r.reserva_id,
      c.confirmacao_id,
      max(
        case
          when r.nome_normalizado = c.nome_normalizado then 100
          when cardinality(r.tokens) >= 2 and r.tokens <@ c.tokens then 92
          when cardinality(c.tokens) >= 2 and c.tokens <@ r.tokens then 88
          when cardinality(r.tokens) = 1
            and length(r.tokens[1]) >= 4
            and r.tokens[1] = any(c.tokens) then 72
          else 0
        end
      ) as pontuacao
    from reservas_pendentes r
    join candidatos_validos c
      on c.evento_id = r.evento_id
     and (
       r.nome_normalizado = c.nome_normalizado
       or (cardinality(r.tokens) >= 2 and r.tokens <@ c.tokens)
       or (cardinality(c.tokens) >= 2 and c.tokens <@ r.tokens)
       or (
         cardinality(r.tokens) = 1
         and length(r.tokens[1]) >= 4
         and r.tokens[1] = any(c.tokens)
       )
     )
    group by r.reserva_id, c.confirmacao_id
  ), melhores_pontuacoes as (
    select reserva_id, max(pontuacao) as pontuacao
    from correspondencias
    where pontuacao > 0
    group by reserva_id
  ), vencedores_unicos as (
    select
      c.reserva_id,
      min(c.confirmacao_id) as confirmacao_id
    from correspondencias c
    join melhores_pontuacoes m
      on m.reserva_id = c.reserva_id
     and m.pontuacao = c.pontuacao
    group by c.reserva_id
    having count(distinct c.confirmacao_id) = 1
  ), atualizadas as (
    update public.reservas_presentes r
    set confirmacao_id = u.confirmacao_id,
        vinculo_origem = 'nome'
    from vencedores_unicos u
    where r.id = u.reserva_id
      and r.evento_id = p_evento_id
      and r.confirmacao_id is null
    returning r.id
  )
  select count(*)::integer into v_relacionadas from atualizadas;

  with nomes_confirmacao as (
    select
      c.id as confirmacao_id,
      public.normalizar_nome_convidado(c.nome) as nome_normalizado,
      public.tokens_nome_convidado(c.nome) as tokens
    from public.confirmacoes c
    where c.evento_id = p_evento_id

    union all

    select
      c.id,
      public.normalizar_nome_convidado(acompanhante.nome),
      public.tokens_nome_convidado(acompanhante.nome)
    from public.confirmacoes c
    cross join lateral jsonb_array_elements_text(
      case
        when jsonb_typeof(c.nomes_acompanhantes) = 'array'
          then c.nomes_acompanhantes
        else '[]'::jsonb
      end
    ) as acompanhante(nome)
    where c.evento_id = p_evento_id
  ), reservas_pendentes as (
    select
      r.id as reserva_id,
      r.nome_normalizado,
      public.tokens_nome_convidado(r.reservado_por) as tokens
    from public.reservas_presentes r
    where r.evento_id = p_evento_id
      and r.confirmacao_id is null
      and length(coalesce(r.nome_normalizado, '')) >= 3
  ), correspondencias as (
    select
      r.reserva_id,
      c.confirmacao_id,
      max(
        case
          when r.nome_normalizado = c.nome_normalizado then 100
          when cardinality(r.tokens) >= 2 and r.tokens <@ c.tokens then 92
          when cardinality(c.tokens) >= 2 and c.tokens <@ r.tokens then 88
          when cardinality(r.tokens) = 1
            and length(r.tokens[1]) >= 4
            and r.tokens[1] = any(c.tokens) then 72
          else 0
        end
      ) as pontuacao
    from reservas_pendentes r
    join nomes_confirmacao c
      on (
        r.nome_normalizado = c.nome_normalizado
        or (cardinality(r.tokens) >= 2 and r.tokens <@ c.tokens)
        or (cardinality(c.tokens) >= 2 and c.tokens <@ r.tokens)
        or (
          cardinality(r.tokens) = 1
          and length(r.tokens[1]) >= 4
          and r.tokens[1] = any(c.tokens)
        )
      )
    group by r.reserva_id, c.confirmacao_id
  ), melhores as (
    select reserva_id, max(pontuacao) as pontuacao
    from correspondencias
    where pontuacao > 0
    group by reserva_id
  )
  select count(*)::integer
  into v_ambiguas
  from (
    select c.reserva_id
    from correspondencias c
    join melhores m
      on m.reserva_id = c.reserva_id
     and m.pontuacao = c.pontuacao
    group by c.reserva_id
    having count(distinct c.confirmacao_id) > 1
  ) ambiguas;

  select count(*)::integer
  into v_pendentes
  from public.reservas_presentes r
  where r.evento_id = p_evento_id
    and r.confirmacao_id is null;

  return query select v_relacionadas, v_ambiguas, v_pendentes;
end;
$$;

revoke all on function public.relacionar_reservas_legadas_por_nome(bigint) from public;
grant execute on function public.relacionar_reservas_legadas_por_nome(bigint) to service_role;

-- Reprocessa somente registros ainda pendentes.
do $$
declare
  evento_record record;
begin
  for evento_record in select id from public.eventos loop
    perform public.relacionar_reservas_legadas_por_nome(evento_record.id);
  end loop;
end $$;

commit;
