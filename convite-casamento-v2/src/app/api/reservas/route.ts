import { NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";

type ReservaPayload = {
  evento_id: number;
  presente_id: number;
  reservado_por?: string;
  nome_reserva?: string;
};

function isMissingRpcError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST202" ||
    error?.code === "42883" ||
    /function.*does not exist/i.test(error?.message || "")
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReservaPayload;

    const eventoId = Number(body.evento_id);
    const presenteId = Number(body.presente_id);
    const reservadoPor = String(body.reservado_por || body.nome_reserva || "")
      .trim()
      .slice(0, 120);

    if (!eventoId || Number.isNaN(eventoId)) {
      return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
    }

    if (!presenteId || Number.isNaN(presenteId)) {
      return NextResponse.json({ error: "Presente inválido." }, { status: 400 });
    }

    if (!reservadoPor) {
      return NextResponse.json(
        { error: "Informe seu nome para reservar o presente." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: evento, error: eventoError } = await supabase
      .from("eventos")
      .select("id, ativo")
      .eq("id", eventoId)
      .maybeSingle();

    if (eventoError || !evento || !evento.ativo) {
      return NextResponse.json(
        { error: "Este evento não está disponível para reservas." },
        { status: 404 },
      );
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "reservar_presente",
      {
        p_evento_id: eventoId,
        p_presente_id: presenteId,
        p_reservado_por: reservadoPor,
      },
    );

    if (!rpcError) {
      const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      return NextResponse.json(
        {
          success: true,
          message: result?.usa_cotas
            ? "Cota reservada com sucesso."
            : "Presente reservado com sucesso.",
          data: result,
        },
        { status: 200 },
      );
    }

    if (!isMissingRpcError(rpcError)) {
      const clientMessage = /indisponível|reservad|cotas/i.test(rpcError.message)
        ? rpcError.message
        : "Não foi possível registrar a reserva.";
      return NextResponse.json({ error: clientMessage }, { status: 400 });
    }

    // Compatibilidade temporária para bancos que ainda não executaram a migration V2.
    const { data: presente, error: presenteError } = await supabase
      .from("presentes")
      .select("*")
      .eq("id", presenteId)
      .eq("evento_id", eventoId)
      .single();

    if (presenteError || !presente) {
      return NextResponse.json(
        { error: "Presente não encontrado para este evento." },
        { status: 404 },
      );
    }

    const usaCotas = Boolean(presente.usa_cotas);
    const quantidadeTotal = Math.max(Number(presente.quantidade_total || 1), 1);
    const quantidadeReservada = Math.max(Number(presente.quantidade_reservada || 0), 0);

    if (
      (usaCotas && quantidadeReservada >= quantidadeTotal) ||
      (!usaCotas && (presente.status === "reservado" || quantidadeReservada > 0))
    ) {
      return NextResponse.json(
        { error: usaCotas ? "Todas as cotas já foram reservadas." : "Este presente já foi reservado." },
        { status: 400 },
      );
    }

    const { data: reserva, error: insertError } = await supabase
      .from("reservas_presentes")
      .insert({
        evento_id: eventoId,
        presente_id: presenteId,
        reservado_por: reservadoPor,
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Não foi possível registrar a reserva." },
        { status: 500 },
      );
    }

    const novaQuantidadeReservada = quantidadeReservada + 1;
    const novoStatus =
      !usaCotas || novaQuantidadeReservada >= quantidadeTotal
        ? "reservado"
        : "disponivel";

    const { data: updatedGift, error: updateError } = await supabase
      .from("presentes")
      .update({
        quantidade_reservada: novaQuantidadeReservada,
        status: novoStatus,
      })
      .eq("id", presenteId)
      .eq("evento_id", eventoId)
      .eq("quantidade_reservada", quantidadeReservada)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedGift) {
      await supabase.from("reservas_presentes").delete().eq("id", reserva.id);
      return NextResponse.json(
        { error: "O presente acabou de ser reservado por outra pessoa. Atualize a página." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      message: usaCotas ? "Cota reservada com sucesso." : "Presente reservado com sucesso.",
      data: {
        presente_id: presenteId,
        quantidade_reservada: novaQuantidadeReservada,
        status: novoStatus,
        usa_cotas: usaCotas,
      },
    });
  } catch (error) {
    console.error("Erro inesperado ao reservar presente:", error);
    return NextResponse.json(
      { error: "Erro inesperado ao reservar o presente." },
      { status: 500 },
    );
  }
}
