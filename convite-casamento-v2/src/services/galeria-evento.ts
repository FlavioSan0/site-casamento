import { createClient } from "../lib/supabase/server";

export type GaleriaEventoItem = {
  id: number;
  evento_id: number;
  imagem_url: string;
  ordem: number;
  destaque: boolean;
  created_at: string;
};

export async function getGaleriaByEventoId(
  eventoId: number,
): Promise<GaleriaEventoItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("galeria_evento")
    .select("*")
    .eq("evento_id", eventoId)
    .order("ordem", { ascending: true });

  if (error) {
    console.error("Erro ao buscar galeria do evento:", error);
    return [];
  }


  return (data as GaleriaEventoItem[]) || [];
}