import type { createAdminClient } from "./admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function patchEventConfig(
  supabase: AdminClient,
  eventoId: number,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string,
) {
  const now = new Date().toISOString();
  let query = supabase
    .from("configuracoes_evento")
    .update({ ...patch, updated_at: now })
    .eq("evento_id", eventoId);

  if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);

  const { data, error } = await query.select("*").maybeSingle();
  if (error) throw error;
  if (data) return { data, conflict: false };

  const { data: existing, error: readError } = await supabase
    .from("configuracoes_evento")
    .select("id")
    .eq("evento_id", eventoId)
    .maybeSingle();

  if (readError) throw readError;
  if (existing) return { data: null, conflict: true };

  const { data: inserted, error: insertError } = await supabase
    .from("configuracoes_evento")
    .insert({ evento_id: eventoId, ...patch, updated_at: now })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return { data: inserted, conflict: false };
}
