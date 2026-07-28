import { NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";

type RsvpPayload = {
  evento_id: number;
  nome: string;
  telefone: string | null;
  acompanhantes: number;
  nomes_acompanhantes: string[] | null;
  presenca: string;
  observacoes: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RsvpPayload;

    const eventoId = Number(body.evento_id);
    const acompanhantes = Number(body.acompanhantes || 0);

    if (!eventoId) {
      return NextResponse.json(
        { error: "Evento inválido." },
        { status: 400 },
      );
    }

    if (!body.nome?.trim()) {
      return NextResponse.json(
        { error: "Informe seu nome completo." },
        { status: 400 },
      );
    }

    if (!body.presenca?.trim()) {
      return NextResponse.json(
        { error: "Selecione se você irá comparecer." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: config, error: configError } = await supabase
      .from("configuracoes_evento")
      .select("data_limite_confirmacao, max_acompanhantes")
      .eq("evento_id", eventoId)
      .maybeSingle();

    if (configError) {
      console.error(
        "Erro ao buscar configurações do evento:",
        configError.message,
      );
    }

    const maxAcompanhantes = Number(config?.max_acompanhantes ?? 4);

    if (Number.isNaN(acompanhantes) || acompanhantes < 0) {
      return NextResponse.json(
        { error: "Quantidade de acompanhantes inválida." },
        { status: 400 },
      );
    }

    if (acompanhantes > maxAcompanhantes) {
      return NextResponse.json(
        {
          error: `O limite permitido para este evento é de até ${maxAcompanhantes} acompanhante(s).`,
        },
        { status: 400 },
      );
    }

    if (config?.data_limite_confirmacao) {
      const hoje = new Date();
      const limite = new Date(`${config.data_limite_confirmacao}T23:59:59`);

      if (hoje.getTime() > limite.getTime()) {
        return NextResponse.json(
          { error: "O prazo para confirmação de presença já foi encerrado." },
          { status: 400 },
        );
      }
    }

    const nomesAcompanhantes = Array.isArray(body.nomes_acompanhantes)
      ? body.nomes_acompanhantes
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      : [];

    if (acompanhantes > 0 && nomesAcompanhantes.length !== acompanhantes) {
      return NextResponse.json(
        { error: "Preencha o nome de todos os acompanhantes." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("confirmacoes")
      .insert([
        {
          evento_id: eventoId,
          nome: body.nome.trim(),
          telefone: body.telefone?.trim() || null,
          acompanhantes,
          nomes_acompanhantes: acompanhantes > 0 ? nomesAcompanhantes : null,
          presenca: body.presenca.trim(),
          observacoes: body.observacoes?.trim() || null,
        },
      ])
      .select("*")
      .single();

    if (error) {
      console.error("Erro ao salvar confirmação:", error.message);
      return NextResponse.json(
        { error: "Não foi possível registrar sua confirmação." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Confirmação enviada com sucesso.",
        data,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro inesperado no RSVP:", error);

    return NextResponse.json(
      { error: "Erro inesperado ao enviar confirmação." },
      { status: 500 },
    );
  }
}