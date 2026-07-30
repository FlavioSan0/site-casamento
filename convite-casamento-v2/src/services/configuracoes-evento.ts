import { cache } from "react";
import { createClient } from "../lib/supabase/server";
import type { ReservedDressColor } from "../lib/utils/reserved-colors";

export type ConfiguracaoEvento = {
  id?: number;
  evento_id: number;

  mensagem_confirmacao: string | null;
  data_limite_confirmacao: string | null;

  chave_pix: string | null;
  qr_pix_url: string | null;

  dress_code_titulo: string | null;
  dress_code_descricao: string | null;
  dress_code_homens: string | null;
  dress_code_mulheres: string | null;
  dress_code_cores: string | null;
  dress_code_cores_paleta: ReservedDressColor[] | null;
  dress_code_observacao: string | null;

  max_acompanhantes: number | null;

  cor_primaria: string | null;
  cor_secundaria: string | null;
  cor_acento: string | null;
  cor_fundo: string | null;
  cor_superficie: string | null;

  modelo_layout: string | null;

  hero_background_type: "none" | "image" | "video" | null;
  hero_background_url: string | null;
  hero_overlay_opacity: number | null;

  historia_ativa: boolean | null;
  historia_titulo: string | null;
  historia_descricao: string | null;
  historia_modelo_grid: "editorial" | "mosaico" | "timeline" | null;
  updated_at: string | null;
};

export const getConfiguracaoEvento = cache(async (
  eventoId: number,
): Promise<ConfiguracaoEvento | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("configuracoes_evento")
    .select("*")
    .eq("evento_id", eventoId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar configurações do evento:", error.message);
    return null;
  }

  return data as ConfiguracaoEvento | null;
});
