import { createClient } from "../lib/supabase/server";
import type { Presente } from "../types/presente";

export async function getPresentesByEventoId(
  eventoId: number,
): Promise<Presente[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("presentes")
    .select("*")
    .eq("evento_id", eventoId)
    .order("id", { ascending: true });

  if (error) {
    console.error("Erro ao buscar presentes:", error.message);
    return [];
  }

  return (data as Presente[]) || [];
}