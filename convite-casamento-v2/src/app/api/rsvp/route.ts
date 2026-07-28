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
    const nome = String(body.nome || "").trim();
    const telefone = String(body.telefone || "").trim();
    const presenca = String(body.presenca || "").trim();
    const observacoes = String(body.observacoes || "").trim();

    if (!eventoId) {
      return NextResponse.json(
        { error: "Evento inválido." },
        { status: 400 },
      );
    }

    if (!nome || nome.length > 120) {
      return NextResponse.json(
        { error: "Informe um nome válido com até 120 caracteres." },
        { status: 400 },
      );
    }

    if (presenca !== "sim" && presenca !== "nao") {
      return NextResponse.json(
        { error: "Selecione se você irá comparecer." },
        { status: 400 },
      );
    }

    if (telefone.length > 24 || observacoes.length > 1000) {
      return NextResponse.json(
        { error: "Telefone ou observações excedem o limite permitido." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: evento } = await supabase
      .from("eventos")
      .select("id")
      .eq("id", eventoId)
      .eq("ativo", true)
      .maybeSingle();

    if (!evento) {
      return NextResponse.json(
        { error: "Este evento não está disponível para confirmações." },
        { status: 404 },
      );
    }

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

    if (nomesAcompanhantes.some((item) => item.length > 120)) {
      return NextResponse.json(
        { error: "O nome de cada acompanhante deve ter até 120 caracteres." },
        { status: 400 },
      );
    }

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
          nome,
          telefone: telefone || null,
          acompanhantes,
          nomes_acompanhantes: acompanhantes > 0 ? nomesAcompanhantes : null,
          presenca,
          observacoes: observacoes || null,
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
