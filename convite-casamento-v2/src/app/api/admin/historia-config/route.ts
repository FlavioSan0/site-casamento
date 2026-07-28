import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { requireAdminApiUser } from "../../../../lib/supabase/auth";

type HistoriaConfigPayload = {
  evento_id: number;
  historia_ativa: boolean;
  historia_titulo: string | null;
  historia_descricao: string | null;
  historia_modelo_grid: string | null;
};

function normalizeText(value: string | null | undefined) {
  const text = String(value || "").trim();
  return text.length > 0 ? text : null;
}

function normalizeGrid(value: string | null | undefined) {
  const allowed = ["editorial", "mosaico", "timeline"];
  return allowed.includes(String(value)) ? String(value) : "editorial";
}

export async function POST(request: Request) {
  const authError = await requireAdminApiUser();
  if (authError) return authError;

  try {
    const body = (await request.json()) as HistoriaConfigPayload;

    const eventoId = Number(body.evento_id);

    if (!eventoId || Number.isNaN(eventoId)) {
      return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("configuracoes_evento")
      .upsert(
        {
          evento_id: eventoId,
          historia_ativa: !!body.historia_ativa,
          historia_titulo: normalizeText(body.historia_titulo),
          historia_descricao: normalizeText(body.historia_descricao),
          historia_modelo_grid: normalizeGrid(body.historia_modelo_grid),
        },
        { onConflict: "evento_id" },
      );

    if (error) {
      console.error("Erro ao salvar configuração da história:", error.message);

      return NextResponse.json(
        { error: "Não foi possível salvar as configurações da história." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Configurações da história salvas com sucesso.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro inesperado ao salvar configuração da história:", error);

    return NextResponse.json(
      { error: "Erro inesperado ao salvar configuração da história." },
      { status: 500 },
    );
  }
}
