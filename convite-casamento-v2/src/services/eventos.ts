import { cache } from "react";
import { createClient } from "../lib/supabase/server";
import type { Evento } from "../types/evento";

export const getEventoBySlug = cache(async (slug: string): Promise<Evento | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("eventos")
    .select("*")
    .eq("slug", slug)
    .eq("ativo", true)
    .single();

  if (error) {
    console.error("Erro ao buscar evento por slug:", error.message);
    return null;
  }

  return data as Evento;
});
