-- Relaciona reservas de presentes às confirmações pelo telefone normalizado.
-- Migration segura e idempotente. Não remove registros existentes.

begin;

alter table public.confirmacoes
  add column if not exists telefone_normalizado text;

alter table public.reservas_presentes
  add column if not exists telefone text;

alter table public.reservas_presentes
  add column if not exists telefone_normalizado text;

alter table public.reservas_presentes
  add column if not exists confirmacao_id bigint;

update public.confirmacoes
set telefone_normalizado = case
  when length(regexp_replace(coalesce(telefone, ''), '\D', '', 'g')) = 13
       and regexp_replace(coalesce(telefone, ''), '\D', '', 'g') like '55%'
    then substring(regexp_replace(telefone, '\D', '', 'g') from 3)
  else right(regexp_replace(coalesce(telefone, ''), '\D', '', 'g'), 11)
end
where coalesce(telefone, '') <> '';

update public.reservas_presentes
set telefone_normalizado = case
  when length(regexp_replace(coalesce(telefone, ''), '\D', '', 'g')) = 13
       and regexp_replace(coalesce(telefone, ''), '\D', '', 'g') like '55%'
    then substring(regexp_replace(telefone, '\D', '', 'g') from 3)
  else right(regexp_replace(coalesce(telefone, ''), '\D', '', 'g'), 11)
end
where coalesce(telefone, '') <> '';

update public.reservas_presentes r
set confirmacao_id = (
  select c.id
  from public.confirmacoes c
  where c.evento_id = r.evento_id
    and c.telefone_normalizado is not null
    and c.telefone_normalizado <> ''
    and c.telefone_normalizado = r.telefone_normalizado
  order by c.created_at desc, c.id desc
  limit 1
)
where r.confirmacao_id is null
  and coalesce(r.telefone_normalizado, '') <> ''
  and exists (
    select 1
    from public.confirmacoes c
    where c.evento_id = r.evento_id
      and c.telefone_normalizado = r.telefone_normalizado
  );

create index if not exists confirmacoes_evento_telefone_normalizado_idx
  on public.confirmacoes(evento_id, telefone_normalizado);

create index if not exists reservas_evento_telefone_normalizado_idx
  on public.reservas_presentes(evento_id, telefone_normalizado);

create index if not exists reservas_confirmacao_id_idx
  on public.reservas_presentes(confirmacao_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reservas_presentes_confirmacao_id_fkey'
  ) then
    alter table public.reservas_presentes
      add constraint reservas_presentes_confirmacao_id_fkey
      foreign key (confirmacao_id)
      references public.confirmacoes(id)
      on delete set null;
  end if;
end $$;

create or replace function public.reservar_presente_com_contato(
  p_evento_id bigint,
  p_presente_id bigint,
  p_reservado_por text,
  p_telefone text
)
returns table (
  presente_id bigint,
  quantidade_reservada integer,
  status text,
  usa_cotas boolean,
  reserva_id bigint,
  confirmacao_id bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_presente public.presentes%rowtype;
  v_nova_quantidade integer;
  v_novo_status text;
  v_telefone text;
  v_confirmacao_id bigint;
  v_reserva_id bigint;
begin
  if trim(coalesce(p_reservado_por, '')) = '' then
    raise exception 'Informe seu nome para reservar.';
  end if;

  v_telefone := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  if length(v_telefone) = 13 and v_telefone like '55%' then
    v_telefone := substring(v_telefone from 3);
  elsif length(v_telefone) > 11 then
    v_telefone := right(v_telefone, 11);
  end if;

  if length(v_telefone) not in (10, 11) then
    raise exception 'Informe um telefone válido para relacionar sua reserva.';
  end if;

  select c.id
  into v_confirmacao_id
  from public.confirmacoes c
  where c.evento_id = p_evento_id
    and c.telefone_normalizado = v_telefone
  order by c.created_at desc, c.id desc
  limit 1;

  select *
  into v_presente
  from public.presentes p
  where p.id = p_presente_id
    and p.evento_id = p_evento_id
  for update;

  if not found then
    raise exception 'Presente não encontrado para este evento.';
  end if;

  if v_presente.usa_cotas then
    if v_presente.quantidade_reservada >= v_presente.quantidade_total then
      raise exception 'Todas as cotas deste presente já foram reservadas.';
    end if;
  elsif v_presente.status = 'reservado' or v_presente.quantidade_reservada > 0 then
    raise exception 'Este presente já foi reservado.';
  end if;

  insert into public.reservas_presentes (
    evento_id,
    presente_id,
    reservado_por,
    telefone,
    telefone_normalizado,
    confirmacao_id
  ) values (
    p_evento_id,
    p_presente_id,
    left(trim(p_reservado_por), 120),
    left(trim(p_telefone), 24),
    v_telefone,
    v_confirmacao_id
  )
  returning id into v_reserva_id;

  v_nova_quantidade := v_presente.quantidade_reservada + 1;
  v_novo_status := case
    when not v_presente.usa_cotas then 'reservado'
    when v_nova_quantidade >= v_presente.quantidade_total then 'reservado'
    else 'disponivel'
  end;

  update public.presentes p
  set quantidade_reservada = v_nova_quantidade,
      status = v_novo_status
  where p.id = p_presente_id
    and p.evento_id = p_evento_id;

  return query
  select
    p_presente_id,
    v_nova_quantidade,
    v_novo_status,
    v_presente.usa_cotas,
    v_reserva_id,
    v_confirmacao_id;
end;
$$;

revoke all on function public.reservar_presente_com_contato(bigint, bigint, text, text) from public;
grant execute on function public.reservar_presente_com_contato(bigint, bigint, text, text) to service_role;

commit;
