import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { requireAdminApiUser } from "../../../../lib/supabase/auth";

type ConfirmacaoPayload = {
  id?: number;
  evento_id: number;
  nome: string;
  telefone: string | null;
  acompanhantes: number;
  nomes_acompanhantes: string[] | null;
  presenca: string;
  observacoes: string | null;
};

function normalizePhone(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export async function POST(request: Request) {
  const authError = await requireAdminApiUser();
  if (authError) return authError;

  try {
    const body = (await request.json()) as Partial<ConfirmacaoPayload>;

    const id = body.id ? Number(body.id) : null;
    const eventoId = Number(body.evento_id);
    const nome = String(body.nome || "").trim();
    const telefone = body.telefone ? normalizePhone(body.telefone) : null;
    const acompanhantes = Number(body.acompanhantes ?? 0);
    const presenca = String(body.presenca || "").trim();
    const observacoes = String(body.observacoes || "").trim() || null;
    const nomesAcompanhantes = Array.isArray(body.nomes_acompanhantes)
      ? body.nomes_acompanhantes
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      : [];

    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { error: "ID da confirmação inválido." },
        { status: 400 },
      );
    }

    if (!eventoId || Number.isNaN(eventoId)) {
      return NextResponse.json(
        { error: "Evento inválido." },
        { status: 400 },
      );
    }

    if (!nome) {
      return NextResponse.json(
        { error: "Informe o nome." },
        { status: 400 },
      );
    }

    if (!presenca) {
      return NextResponse.json(
        { error: "Informe a presença." },
        { status: 400 },
      );
    }

    if (Number.isNaN(acompanhantes) || acompanhantes < 0) {
      return NextResponse.json(
        { error: "Quantidade de acompanhantes inválida." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data: config } = await supabase
      .from("configuracoes_evento")
      .select("max_acompanhantes")
      .eq("evento_id", eventoId)
      .maybeSingle();
    const maxAcompanhantes = Math.min(
      Math.max(Number(config?.max_acompanhantes ?? 4), 0),
      10,
    );

    if (acompanhantes > maxAcompanhantes) {
      return NextResponse.json(
        { error: `O limite é de até ${maxAcompanhantes} acompanhante(s).` },
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
      .update({
        nome,
        telefone,
        acompanhantes,
        nomes_acompanhantes: acompanhantes > 0 ? nomesAcompanhantes : null,
        presenca,
        observacoes,
      })
      .eq("id", id)
      .eq("evento_id", eventoId)
      .select("*")
      .single();

    if (error) {
      console.error("Erro ao atualizar confirmação:", error.message);
      return NextResponse.json(
        { error: "Não foi possível atualizar a confirmação." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, message: "Confirmação atualizada com sucesso.", data },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro inesperado ao atualizar confirmação:", error);

    return NextResponse.json(
      { error: "Erro inesperado ao atualizar a confirmação." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdminApiUser();
  if (authError) return authError;

  try {
    const id = Number(request.nextUrl.searchParams.get("id"));
    const eventoId = Number(request.nextUrl.searchParams.get("evento_id"));

    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    if (!eventoId || Number.isNaN(eventoId)) {
      return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("confirmacoes")
      .delete()
      .eq("id", id)
      .eq("evento_id", eventoId);

    if (error) {
      console.error("Erro ao excluir confirmação:", error.message);
      return NextResponse.json(
        { error: "Não foi possível excluir a confirmação." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, message: "Confirmação excluída com sucesso." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro inesperado ao excluir confirmação:", error);

    return NextResponse.json(
      { error: "Erro inesperado ao excluir a confirmação." },
      { status: 500 },
    );
  }
}
