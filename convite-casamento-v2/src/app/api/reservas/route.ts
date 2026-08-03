import { NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";
import { formatPhoneBR, isValidPhoneBR, normalizePhoneBR } from "../../../lib/utils/format-phone";
import { normalizePersonName } from "../../../lib/utils/normalize-person-name";

type ReservaPayload = {
  evento_id: number;
  presente_id: number;
  reservado_por?: string;
  nome_reserva?: string;
  telefone?: string;
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
    const telefoneNormalizado = normalizePhoneBR(body.telefone);
    const nomeNormalizado = normalizePersonName(reservadoPor);
    const telefone = formatPhoneBR(telefoneNormalizado);

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

    if (!isValidPhoneBR(telefoneNormalizado)) {
      return NextResponse.json(
        { error: "Informe um telefone válido para relacionar sua reserva." },
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
      "reservar_presente_com_contato",
      {
        p_evento_id: eventoId,
        p_presente_id: presenteId,
        p_reservado_por: reservadoPor,
        p_telefone: telefone,
      },
    );

    if (!rpcError) {
      const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      let linkedResult = result;

      if (result?.reserva_id) {
        if (result?.confirmacao_id) {
          await supabase
            .from("reservas_presentes")
            .update({ vinculo_origem: "telefone" })
            .eq("id", result.reserva_id)
            .eq("evento_id", eventoId)
            .is("vinculo_origem", null);
        }

        const { error: nameLinkError } = await supabase.rpc(
          "relacionar_reservas_legadas_por_nome",
          { p_evento_id: eventoId },
        );

        if (
          nameLinkError &&
          !["PGRST202", "42883"].includes(nameLinkError.code || "")
        ) {
          console.error(
            "Erro ao relacionar reserva pelo nome:",
            nameLinkError.message,
          );
        }

        const { data: linkedReservation } = await supabase
          .from("reservas_presentes")
          .select("confirmacao_id, vinculo_origem")
          .eq("id", result.reserva_id)
          .eq("evento_id", eventoId)
          .maybeSingle();

        linkedResult = {
          ...result,
          confirmacao_id:
            linkedReservation?.confirmacao_id ?? result.confirmacao_id ?? null,
          vinculo_origem: linkedReservation?.vinculo_origem ?? null,
        };
      }

      return NextResponse.json(
        {
          success: true,
          message: result?.usa_cotas
            ? "Cota reservada com sucesso."
            : "Presente reservado com sucesso.",
          data: linkedResult,
        },
        { status: 200 },
      );
    }

    if (!isMissingRpcError(rpcError)) {
      const clientMessage = /indisponível|reservad|cotas|telefone/i.test(
        rpcError.message,
      )
        ? rpcError.message
        : "Não foi possível registrar a reserva.";
      return NextResponse.json({ error: clientMessage }, { status: 400 });
    }

    // Compatibilidade temporária para bancos que ainda não executaram a migration.
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
    const quantidadeReservada = Math.max(
      Number(presente.quantidade_reservada || 0),
      0,
    );

    if (
      (usaCotas && quantidadeReservada >= quantidadeTotal) ||
      (!usaCotas &&
        (presente.status === "reservado" || quantidadeReservada > 0))
    ) {
      return NextResponse.json(
        {
          error: usaCotas
            ? "Todas as cotas já foram reservadas."
            : "Este presente já foi reservado.",
        },
        { status: 400 },
      );
    }

    const { data: confirmacao } = await supabase
      .from("confirmacoes")
      .select("id")
      .eq("evento_id", eventoId)
      .eq("telefone_normalizado", telefoneNormalizado)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: reserva, error: insertError } = await supabase
      .from("reservas_presentes")
      .insert({
        evento_id: eventoId,
        presente_id: presenteId,
        reservado_por: reservadoPor,
        nome_normalizado: nomeNormalizado,
        telefone,
        telefone_normalizado: telefoneNormalizado,
        confirmacao_id: confirmacao?.id || null,
        vinculo_origem: confirmacao?.id ? "telefone" : null,
      })
      .select("id, confirmacao_id")
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
        {
          error:
            "O presente acabou de ser reservado por outra pessoa. Atualize a página.",
        },
        { status: 409 },
      );
    }

    await supabase.rpc("relacionar_reservas_legadas_por_nome", {
      p_evento_id: eventoId,
    });

    const { data: linkedReservation } = await supabase
      .from("reservas_presentes")
      .select("confirmacao_id, vinculo_origem")
      .eq("id", reserva.id)
      .eq("evento_id", eventoId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      message: usaCotas
        ? "Cota reservada com sucesso."
        : "Presente reservado com sucesso.",
      data: {
        presente_id: presenteId,
        quantidade_reservada: novaQuantidadeReservada,
        status: novoStatus,
        usa_cotas: usaCotas,
        reserva_id: reserva.id,
        confirmacao_id:
          linkedReservation?.confirmacao_id ?? reserva.confirmacao_id,
        vinculo_origem: linkedReservation?.vinculo_origem ?? null,
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
