import { createClient } from "../lib/supabase/server";
import type { ReservaPresente } from "../types/reserva";

export async function getReservasByEventoId(
  eventoId: number,
): Promise<ReservaPresente[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reservas_presentes")
    .select(
      "id, evento_id, presente_id, reservado_por, telefone, telefone_normalizado, nome_normalizado, confirmacao_id, vinculo_origem, presente_recebido, presente_recebido_em, created_at, presentes(nome, usa_cotas, valor)",
    )
    .eq("evento_id", eventoId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar reservas:", error.message);
    return [];
  }

  return (data || []) as unknown as ReservaPresente[];
}
