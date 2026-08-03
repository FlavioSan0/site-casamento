import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { requireAdminApiUser } from "../../../../../lib/supabase/auth";

type LinkReservationPayload = {
  evento_id?: number;
  reserva_id?: number;
  confirmacao_id?: number | null;
};

export async function POST(request: Request) {
  const authError = await requireAdminApiUser();
  if (authError) return authError;

  try {
    const body = (await request.json()) as LinkReservationPayload;
    const eventoId = Number(body.evento_id);
    const reservaId = Number(body.reserva_id);
    const confirmacaoId =
      body.confirmacao_id === null || body.confirmacao_id === undefined
        ? null
        : Number(body.confirmacao_id);

    if (!eventoId || Number.isNaN(eventoId)) {
      return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
    }

    if (!reservaId || Number.isNaN(reservaId)) {
      return NextResponse.json({ error: "Reserva inválida." }, { status: 400 });
    }

    if (confirmacaoId !== null && (!confirmacaoId || Number.isNaN(confirmacaoId))) {
      return NextResponse.json(
        { error: "Confirmação inválida." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: reserva, error: reservaError } = await supabase
      .from("reservas_presentes")
      .select("id, evento_id")
      .eq("id", reservaId)
      .eq("evento_id", eventoId)
      .maybeSingle();

    if (reservaError) throw reservaError;
    if (!reserva) {
      return NextResponse.json(
        { error: "Reserva não encontrada neste evento." },
        { status: 404 },
      );
    }

    if (confirmacaoId !== null) {
      const { data: confirmacao, error: confirmacaoError } = await supabase
        .from("confirmacoes")
        .select("id, evento_id")
        .eq("id", confirmacaoId)
        .eq("evento_id", eventoId)
        .maybeSingle();

      if (confirmacaoError) throw confirmacaoError;
      if (!confirmacao) {
        return NextResponse.json(
          { error: "Confirmação não encontrada neste evento." },
          { status: 404 },
        );
      }
    }

    const { data, error } = await supabase
      .from("reservas_presentes")
      .update({
        confirmacao_id: confirmacaoId,
        vinculo_origem: confirmacaoId === null ? null : "manual",
      })
      .eq("id", reservaId)
      .eq("evento_id", eventoId)
      .select("id, confirmacao_id, vinculo_origem")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message:
        confirmacaoId === null
          ? "Vínculo removido com sucesso."
          : "Reserva relacionada manualmente com sucesso.",
      data,
    });
  } catch (error) {
    console.error("Erro ao relacionar reserva manualmente:", error);
    return NextResponse.json(
      { error: "Não foi possível relacionar a reserva." },
      { status: 500 },
    );
  }
}
