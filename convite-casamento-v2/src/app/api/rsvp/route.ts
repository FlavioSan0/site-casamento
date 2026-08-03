import { NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";
import { formatPhoneBR, isValidPhoneBR, normalizePhoneBR } from "../../../lib/utils/format-phone";
import { normalizePersonName } from "../../../lib/utils/normalize-person-name";

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
    const telefoneNormalizado = normalizePhoneBR(body.telefone);
    const nomeNormalizado = normalizePersonName(nome);
    const telefone = formatPhoneBR(telefoneNormalizado);
    const presenca = String(body.presenca || "").trim();
    const observacoes = String(body.observacoes || "").trim();

    if (!eventoId) {
      return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
    }

    if (!nome || nome.length > 120) {
      return NextResponse.json(
        { error: "Informe um nome válido com até 120 caracteres." },
        { status: 400 },
      );
    }

    if (!isValidPhoneBR(telefoneNormalizado)) {
      return NextResponse.json(
        { error: "Informe um telefone válido para sua confirmação." },
        { status: 400 },
      );
    }

    if (presenca !== "sim" && presenca !== "nao") {
      return NextResponse.json(
        { error: "Selecione se você irá comparecer." },
        { status: 400 },
      );
    }

    if (observacoes.length > 1000) {
      return NextResponse.json(
        { error: "As observações excedem o limite permitido." },
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
      console.error("Erro ao buscar configurações do evento:", configError.message);
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

    const presencaDb =
      presenca === "sim" ? "Sim, estarei presente" : "Não poderei comparecer";

    const confirmationPayload = {
      evento_id: eventoId,
      nome,
      nome_normalizado: nomeNormalizado,
      telefone,
      telefone_normalizado: telefoneNormalizado,
      acompanhantes: presenca === "sim" ? acompanhantes : 0,
      nomes_acompanhantes:
        presenca === "sim" && acompanhantes > 0 ? nomesAcompanhantes : null,
      presenca: presencaDb,
      observacoes: observacoes || null,
    };

    const { data: existingByPhone } = await supabase
      .from("confirmacoes")
      .select("id")
      .eq("evento_id", eventoId)
      .eq("telefone_normalizado", telefoneNormalizado)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let existing = existingByPhone;

    if (!existing?.id && nomeNormalizado) {
      const { data: legacyCandidates, error: legacyMatchError } = await supabase
        .from("confirmacoes")
        .select("id, telefone_normalizado")
        .eq("evento_id", eventoId)
        .eq("nome_normalizado", nomeNormalizado)
        .limit(3);

      if (legacyMatchError) {
        console.error(
          "Erro ao procurar confirmação antiga pelo nome:",
          legacyMatchError.message,
        );
      } else {
        const candidatesWithoutPhone = (legacyCandidates || []).filter(
          (candidate) => !normalizePhoneBR(candidate.telefone_normalizado),
        );

        if (candidatesWithoutPhone.length === 1) {
          existing = { id: candidatesWithoutPhone[0].id };
        }
      }
    }

    const result = existing?.id
      ? await supabase
          .from("confirmacoes")
          .update(confirmationPayload)
          .eq("id", existing.id)
          .eq("evento_id", eventoId)
          .select("*")
          .single()
      : await supabase
          .from("confirmacoes")
          .insert([confirmationPayload])
          .select("*")
          .single();

    const { data, error } = result;

    if (error) {
      console.error("Erro ao salvar confirmação:", error.message);
      return NextResponse.json(
        { error: "Não foi possível registrar sua confirmação." },
        { status: 500 },
      );
    }

    const { error: linkError } = await supabase
      .from("reservas_presentes")
      .update({ confirmacao_id: data.id, vinculo_origem: "telefone" })
      .eq("evento_id", eventoId)
      .eq("telefone_normalizado", telefoneNormalizado)
      .is("confirmacao_id", null);

    if (linkError) {
      console.error("Erro ao relacionar reservas à confirmação:", linkError.message);
    }
    const { error: nameLinkError } = await supabase.rpc(
      "relacionar_reservas_legadas_por_nome",
      { p_evento_id: eventoId },
    );

    if (nameLinkError && !["PGRST202", "42883"].includes(nameLinkError.code || "")) {
      console.error(
        "Erro ao relacionar reservas antigas pelo nome:",
        nameLinkError.message,
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: existing?.id
          ? "Confirmação atualizada com sucesso."
          : "Confirmação enviada com sucesso.",
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
