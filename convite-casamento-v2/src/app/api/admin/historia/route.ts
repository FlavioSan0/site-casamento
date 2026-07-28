import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { requireAdminApiUser } from "../../../../lib/supabase/auth";

type HistoriaPayload = {
  id?: number;
  evento_id: number;
  imagem_url: string;
  titulo: string | null;
  descricao: string | null;
  ordem: number;
  destaque: boolean;
};

function normalizeText(value: string | null | undefined) {
  const text = String(value || "").trim();
  return text.length > 0 ? text : null;
}

export async function POST(request: Request) {
  const authError = await requireAdminApiUser();
  if (authError) return authError;

  try {
    const body = (await request.json()) as HistoriaPayload;

    const eventoId = Number(body.evento_id);
    const ordem = Number(body.ordem || 0);

    if (!eventoId || Number.isNaN(eventoId)) {
      return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
    }

    if (!body.imagem_url?.trim()) {
      return NextResponse.json(
        { error: "Informe a imagem do momento." },
        { status: 400 },
      );
    }

    if (Number.isNaN(ordem) || ordem < 0) {
      return NextResponse.json(
        { error: "Informe uma ordem válida." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const payload = {
      evento_id: eventoId,
      imagem_url: body.imagem_url.trim(),
      titulo: normalizeText(body.titulo),
      descricao: normalizeText(body.descricao),
      ordem,
      destaque: !!body.destaque,
    };

    if (body.destaque) {
      await supabase
        .from("historia_momentos")
        .update({ destaque: false })
        .eq("evento_id", eventoId);
    }

    if (body.id) {
      const { data, error } = await supabase
        .from("historia_momentos")
        .update(payload)
        .eq("id", Number(body.id))
        .eq("evento_id", eventoId)
        .select("*")
        .single();

      if (error) {
        console.error("Erro ao atualizar momento:", error.message);

        return NextResponse.json(
          { error: "Não foi possível atualizar o momento." },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, data }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("historia_momentos")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("Erro ao cadastrar momento:", error.message);

      return NextResponse.json(
        { error: "Não foi possível cadastrar o momento." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("Erro inesperado ao salvar momento:", error);

    return NextResponse.json(
      { error: "Erro inesperado ao salvar momento." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const authError = await requireAdminApiUser();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);

    const id = Number(searchParams.get("id"));
    const eventoId = Number(searchParams.get("evento_id"));

    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Momento inválido." }, { status: 400 });
    }

    if (!eventoId || Number.isNaN(eventoId)) {
      return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("historia_momentos")
      .delete()
      .eq("id", id)
      .eq("evento_id", eventoId);

    if (error) {
      console.error("Erro ao excluir momento:", error.message);

      return NextResponse.json(
        { error: "Não foi possível excluir o momento." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, message: "Momento excluído com sucesso." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro inesperado ao excluir momento:", error);

    return NextResponse.json(
      { error: "Erro inesperado ao excluir momento." },
      { status: 500 },
    );
  }
}
