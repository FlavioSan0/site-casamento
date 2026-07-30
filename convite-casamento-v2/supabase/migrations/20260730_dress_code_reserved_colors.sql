-- Adiciona uma paleta editável para as bolinhas de cores reservadas.
-- Migration segura e idempotente para bancos que já receberam a V2.

alter table public.configuracoes_evento
  add column if not exists dress_code_cores_paleta jsonb
  default '[{"nome":"Azul-marinho","cor":"#08265E"},{"nome":"Bordô","cor":"#800000"},{"nome":"Verde","cor":"#3F6B4A"}]'::jsonb;

update public.configuracoes_evento
set dress_code_cores_paleta = '[{"nome":"Azul-marinho","cor":"#08265E"},{"nome":"Bordô","cor":"#800000"},{"nome":"Verde","cor":"#3F6B4A"}]'::jsonb
where dress_code_cores_paleta is null
   or jsonb_typeof(dress_code_cores_paleta) <> 'array';

alter table public.configuracoes_evento
  alter column dress_code_cores_paleta set default '[{"nome":"Azul-marinho","cor":"#08265E"},{"nome":"Bordô","cor":"#800000"},{"nome":"Verde","cor":"#3F6B4A"}]'::jsonb;

alter table public.configuracoes_evento
  alter column dress_code_cores_paleta set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'configuracoes_evento_dress_code_cores_paleta_check'
  ) then
    alter table public.configuracoes_evento
      add constraint configuracoes_evento_dress_code_cores_paleta_check
      check (
        jsonb_typeof(dress_code_cores_paleta) = 'array'
        and jsonb_array_length(dress_code_cores_paleta) <= 8
      );
  end if;
end $$;
