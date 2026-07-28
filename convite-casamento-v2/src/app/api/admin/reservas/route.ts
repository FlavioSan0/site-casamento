import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { requireAdminApiUser } from "../../../../lib/supabase/auth";

function isMissingRpcError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST202" ||
    error?.code === "42883" ||
    /function.*does not exist/i.test(error?.message || "")
  );
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdminApiUser();
  if (authError) return authError;

  try {
    const reservaId = Number(request.nextUrl.searchParams.get("id"));
    const eventoId = Number(request.nextUrl.searchParams.get("evento_id"));

    if (!reservaId || Number.isNaN(reservaId)) {
      return NextResponse.json({ error: "Reserva inválida." }, { status: 400 });
    }

    if (!eventoId || Number.isNaN(eventoId)) {
      return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "remover_reserva_presente",
      {
        p_evento_id: eventoId,
        p_reserva_id: reservaId,
      },
    );

    if (!rpcError) {
      return NextResponse.json({
        success: true,
        message: "Reserva removida e disponibilidade restaurada.",
        data: Array.isArray(rpcData) ? rpcData[0] : rpcData,
      });
    }

    if (!isMissingRpcError(rpcError)) {
      return NextResponse.json(
        { error: rpcError.message || "Não foi possível remover a reserva." },
        { status: 400 },
      );
    }

    const { data: reserva, error: reservaError } = await supabase
      .from("reservas_presentes")
      .select("id, presente_id")
      .eq("id", reservaId)
      .eq("evento_id", eventoId)
      .single();

    if (reservaError || !reserva) {
      return NextResponse.json({ error: "Reserva não encontrada." }, { status: 404 });
    }

    const { data: presente, error: presenteError } = await supabase
      .from("presentes")
      .select("id, usa_cotas, quantidade_total, quantidade_reservada")
      .eq("id", reserva.presente_id)
      .eq("evento_id", eventoId)
      .single();

    if (presenteError || !presente) {
      return NextResponse.json({ error: "Presente da reserva não encontrado." }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("reservas_presentes")
      .delete()
      .eq("id", reservaId)
      .eq("evento_id", eventoId);

    if (deleteError) {
      return NextResponse.json({ error: "Não foi possível remover a reserva." }, { status: 500 });
    }

    const quantidadeReservada = Math.max(Number(presente.quantidade_reservada || 0) - 1, 0);
    const status = quantidadeReservada > 0 && !presente.usa_cotas ? "reservado" : "disponivel";

    const { error: updateError } = await supabase
      .from("presentes")
      .update({ quantidade_reservada: quantidadeReservada, status })
      .eq("id", presente.id)
      .eq("evento_id", eventoId);

    if (updateError) {
      return NextResponse.json(
        { error: "Reserva removida, mas a disponibilidade precisa ser revisada." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Reserva removida e disponibilidade restaurada.",
      data: { presente_id: presente.id, quantidade_reservada: quantidadeReservada, status },
    });
  } catch (error) {
    console.error("Erro ao remover reserva:", error);
    return NextResponse.json(
      { error: "Erro inesperado ao remover a reserva." },
      { status: 500 },
    );
  }
}
