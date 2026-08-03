begin;

alter table public.reservas_presentes
  add column if not exists presente_recebido boolean not null default false;

alter table public.reservas_presentes
  add column if not exists presente_recebido_em timestamptz;

update public.reservas_presentes
set presente_recebido = coalesce(presente_recebido, false)
where presente_recebido is null;

update public.reservas_presentes
set presente_recebido_em = case
  when presente_recebido then coalesce(presente_recebido_em, now())
  else null
end;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservas_presentes_recebimento_check'
  ) then
    alter table public.reservas_presentes
      add constraint reservas_presentes_recebimento_check
      check (
        (presente_recebido = false and presente_recebido_em is null)
        or
        (presente_recebido = true and presente_recebido_em is not null)
      );
  end if;
end $$;

create index if not exists idx_reservas_presentes_evento_recebido
  on public.reservas_presentes (evento_id, presente_recebido);

commit;
