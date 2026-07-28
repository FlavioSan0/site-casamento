export type Evento = {
  id: number;
  slug: string;
  nome_evento: string;
  nome_casal: string;
  data_evento: string | null;
  horario_evento: string | null;
  local_cerimonia: string | null;
  link_maps_cerimonia: string | null;
  local_recepcao: string | null;
  link_maps_recepcao: string | null;
  ativo: boolean;
  created_at: string;
};