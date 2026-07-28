import { createClient } from "../lib/supabase/server";

export type HistoriaMomento = {
  id: number;
  evento_id: number;
  imagem_url: string;
  titulo: string | null;
  descricao: string | null;
  ordem: number | null;
  destaque: boolean | null;
  created_at?: string | null;
};

export async function getHistoriaMomentosByEventoId(
  eventoId: number,
): Promise<HistoriaMomento[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("historia_momentos")
    .select("*")
    .eq("evento_id", eventoId)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar momentos da história:", error.message);
    return [];
  }

  return (data || []) as HistoriaMomento[];
}