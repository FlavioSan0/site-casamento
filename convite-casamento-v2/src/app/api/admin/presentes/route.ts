import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { requireAdminApiUser } from "../../../../lib/supabase/auth";

type PresentePayload = {
  id?: number;
  evento_id: number;
  nome: string;
  valor: string | null;
  descricao: string | null;
  imagem_url: string | null;
  usa_cotas: boolean;
  quantidade_total: number;
};

function normalizeValor(value: unknown) {
  const text = String(value || "").trim();
  return text ? text : null;
}

export async function POST(request: Request) {
  const authError = await requireAdminApiUser();
  if (authError) return authError;

  try {
    const body = (await request.json()) as Partial<PresentePayload>;

    const id = body.id ? Number(body.id) : null;
    const eventoId = Number(body.evento_id);
    const nome = String(body.nome || "").trim();
    const valor = normalizeValor(body.valor);
    const descricao = String(body.descricao || "").trim() || null;
    const imagemUrl = String(body.imagem_url || "").trim() || null;
    const usaCotas = Boolean(body.usa_cotas);
    const quantidadeTotal = usaCotas
      ? Number(body.quantidade_total || 0)
      : 1;

    if (!eventoId || Number.isNaN(eventoId)) {
      return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
    }

    if (!nome) {
      return NextResponse.json(
        { error: "Informe o nome do presente." },
        { status: 400 },
      );
    }

    if (usaCotas && (!quantidadeTotal || Number.isNaN(quantidadeTotal) || quantidadeTotal < 1)) {
      return NextResponse.json(
        { error: "Informe uma quantidade total válida para as cotas." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    if (id) {
      const { data: existingGift, error: existingGiftError } = await supabase
        .from("presentes")
        .select("*")
        .eq("id", id)
        .eq("evento_id", eventoId)
        .single();

      if (existingGiftError || !existingGift) {
        return NextResponse.json(
          { error: "Presente não encontrado." },
          { status: 404 },
        );
      }

      const quantidadeReservada = Number(existingGift.quantidade_reservada || 0);

      if (!usaCotas && quantidadeReservada > 1) {
        return NextResponse.json(
          {
            error:
              "Este presente já possui mais de uma reserva. Mantenha-o como presente com cotas.",
          },
          { status: 400 },
        );
      }

      if (usaCotas && quantidadeTotal < quantidadeReservada) {
        return NextResponse.json(
          {
            error:
              "A quantidade total não pode ser menor do que a quantidade já reservada.",
          },
          { status: 400 },
        );
      }

      const quantidadeReservadaFinal = usaCotas
        ? quantidadeReservada
        : quantidadeReservada > 0
          ? 1
          : 0;

      const statusFinal = usaCotas
        ? quantidadeReservadaFinal >= quantidadeTotal
          ? "reservado"
          : "disponivel"
        : quantidadeReservadaFinal > 0
          ? "reservado"
          : "disponivel";

      const { data, error } = await supabase
        .from("presentes")
        .update({
          nome,
          valor,
          descricao,
          imagem_url: imagemUrl,
          usa_cotas: usaCotas,
          quantidade_total: quantidadeTotal,
          quantidade_reservada: quantidadeReservadaFinal,
          status: statusFinal,
        })
        .eq("id", id)
        .eq("evento_id", eventoId)
        .select("*")
        .single();

      if (error) {
        console.error("Erro ao atualizar presente:", error.message);
        return NextResponse.json(
          { error: "Não foi possível atualizar o presente." },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { success: true, message: "Presente atualizado com sucesso.", data },
        { status: 200 },
      );
    }

    const { data, error } = await supabase
      .from("presentes")
      .insert([
        {
          evento_id: eventoId,
          nome,
          valor,
          descricao,
          imagem_url: imagemUrl,
          usa_cotas: usaCotas,
          quantidade_total: quantidadeTotal,
          quantidade_reservada: 0,
          status: "disponivel",
        },
      ])
      .select("*")
      .single();

    if (error) {
      console.error("Erro ao cadastrar presente:", error.message);
      return NextResponse.json(
        { error: "Não foi possível cadastrar o presente." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, message: "Presente cadastrado com sucesso.", data },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro inesperado ao salvar presente:", error);

    return NextResponse.json(
      { error: "Erro inesperado ao salvar o presente." },
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

    const { count, error: reservasError } = await supabase
      .from("reservas_presentes")
      .select("*", { count: "exact", head: true })
      .eq("presente_id", id)
      .eq("evento_id", eventoId);

    if (reservasError) {
      console.error("Erro ao consultar reservas do presente:", reservasError.message);
      return NextResponse.json(
        { error: "Não foi possível validar as reservas do presente." },
        { status: 500 },
      );
    }

    if ((count || 0) > 0) {
      return NextResponse.json(
        {
          error:
            "Este presente possui reservas vinculadas. Exclua as reservas antes de removê-lo.",
        },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("presentes")
      .delete()
      .eq("id", id)
      .eq("evento_id", eventoId);

    if (error) {
      console.error("Erro ao excluir presente:", error.message);
      return NextResponse.json(
        { error: "Não foi possível excluir o presente." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, message: "Presente excluído com sucesso." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro inesperado ao excluir presente:", error);

    return NextResponse.json(
      { error: "Erro inesperado ao excluir o presente." },
      { status: 500 },
    );
  }
}
