-- Relaciona reservas antigas às confirmações pelo nome normalizado.
-- Só realiza vínculo automático quando o nome corresponde a uma única confirmação
-- do mesmo evento. Homônimos permanecem pendentes para revisão manual.

begin;

create or replace function public.normalizar_nome_convidado(p_nome text)
returns text
language sql
immutable
as $$
  select trim(
    regexp_replace(
      regexp_replace(
        translate(
          lower(coalesce(p_nome, '')),
          'áàãâäéèêëíìîïóòõôöúùûüçñ',
          'aaaaaeeeeiiiiooooouuuucn'
        ),
        '[^a-z0-9]+',
        ' ',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

alter table public.confirmacoes
  add column if not exists nome_normalizado text;

alter table public.reservas_presentes
  add column if not exists nome_normalizado text;

alter table public.reservas_presentes
  add column if not exists vinculo_origem text;

update public.confirmacoes
set nome_normalizado = public.normalizar_nome_convidado(nome)
where nome_normalizado is distinct from public.normalizar_nome_convidado(nome);

update public.reservas_presentes
set nome_normalizado = public.normalizar_nome_convidado(reservado_por)
where nome_normalizado is distinct from public.normalizar_nome_convidado(reservado_por);

update public.reservas_presentes
set vinculo_origem = case
  when confirmacao_id is null then null
  when coalesce(telefone_normalizado, '') <> '' then 'telefone'
  else 'manual'
end
where vinculo_origem is null;

create or replace function public.atualizar_nome_normalizado_confirmacao()
returns trigger
language plpgsql
as $$
begin
  new.nome_normalizado := public.normalizar_nome_convidado(new.nome);
  return new;
end;
$$;

create or replace function public.atualizar_nome_normalizado_reserva()
returns trigger
language plpgsql
as $$
begin
  new.nome_normalizado := public.normalizar_nome_convidado(new.reservado_por);
  return new;
end;
$$;

drop trigger if exists confirmacoes_normalizar_nome_trigger on public.confirmacoes;
create trigger confirmacoes_normalizar_nome_trigger
before insert or update of nome on public.confirmacoes
for each row execute function public.atualizar_nome_normalizado_confirmacao();

drop trigger if exists reservas_normalizar_nome_trigger on public.reservas_presentes;
create trigger reservas_normalizar_nome_trigger
before insert or update of reservado_por on public.reservas_presentes
for each row execute function public.atualizar_nome_normalizado_reserva();

create index if not exists confirmacoes_evento_nome_normalizado_idx
  on public.confirmacoes(evento_id, nome_normalizado);

create index if not exists reservas_evento_nome_normalizado_idx
  on public.reservas_presentes(evento_id, nome_normalizado);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reservas_presentes_vinculo_origem_check'
  ) then
    alter table public.reservas_presentes
      add constraint reservas_presentes_vinculo_origem_check
      check (vinculo_origem is null or vinculo_origem in ('telefone', 'nome', 'manual'));
  end if;
end $$;

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
      public.normalizar_nome_convidado(c.nome) as nome_normalizado
    from public.confirmacoes c
    where c.evento_id = p_evento_id

    union all

    select
      c.evento_id,
      c.id as confirmacao_id,
      public.normalizar_nome_convidado(acompanhante.nome) as nome_normalizado
    from public.confirmacoes c
    cross join lateral jsonb_array_elements_text(
      case
        when jsonb_typeof(c.nomes_acompanhantes) = 'array'
          then c.nomes_acompanhantes
        else '[]'::jsonb
      end
    ) as acompanhante(nome)
    where c.evento_id = p_evento_id
  ), nomes_validos as (
    select distinct evento_id, confirmacao_id, nome_normalizado
    from nomes_confirmacao
    where length(nome_normalizado) >= 3
      and nome_normalizado not in ('reserva migrada', 'nao informado', 'sem nome')
  ), candidatos_unicos as (
    select
      evento_id,
      nome_normalizado,
      min(confirmacao_id) as confirmacao_id
    from nomes_validos
    group by evento_id, nome_normalizado
    having count(distinct confirmacao_id) = 1
  ), atualizadas as (
    update public.reservas_presentes r
    set confirmacao_id = u.confirmacao_id,
        vinculo_origem = 'nome'
    from candidatos_unicos u
    where r.evento_id = p_evento_id
      and r.evento_id = u.evento_id
      and r.confirmacao_id is null
      and coalesce(r.nome_normalizado, '') <> ''
      and r.nome_normalizado = u.nome_normalizado
    returning r.id
  )
  select count(*)::integer into v_relacionadas from atualizadas;

  with nomes_confirmacao as (
    select c.id as confirmacao_id, public.normalizar_nome_convidado(c.nome) as nome_normalizado
    from public.confirmacoes c
    where c.evento_id = p_evento_id
    union all
    select c.id, public.normalizar_nome_convidado(acompanhante.nome)
    from public.confirmacoes c
    cross join lateral jsonb_array_elements_text(
      case when jsonb_typeof(c.nomes_acompanhantes) = 'array'
        then c.nomes_acompanhantes else '[]'::jsonb end
    ) as acompanhante(nome)
    where c.evento_id = p_evento_id
  ), ambiguos as (
    select nome_normalizado
    from nomes_confirmacao
    where length(nome_normalizado) >= 3
    group by nome_normalizado
    having count(distinct confirmacao_id) > 1
  )
  select count(*)::integer
  into v_ambiguas
  from public.reservas_presentes r
  where r.evento_id = p_evento_id
    and r.confirmacao_id is null
    and r.nome_normalizado in (select nome_normalizado from ambiguos);

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

-- Executa o casamento inicial para todos os eventos existentes.
do $$
declare
  evento_record record;
begin
  for evento_record in select id from public.eventos loop
    perform public.relacionar_reservas_legadas_por_nome(evento_record.id);
  end loop;
end $$;

commit;
