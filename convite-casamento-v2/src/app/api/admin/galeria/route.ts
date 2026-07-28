import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { requireAdminApiUser } from "../../../../lib/supabase/auth";

type GaleriaPayload = {
  id?: number;
  evento_id: number;
  imagem_url: string;
  ordem: number;
  destaque: boolean;
};

export async function POST(request: Request) {
  const authError = await requireAdminApiUser();
  if (authError) return authError;

  try {
    const body = (await request.json()) as Partial<GaleriaPayload>;

    const id = body.id ? Number(body.id) : null;
    const eventoId = Number(body.evento_id);
    const imagemUrl = String(body.imagem_url || "").trim();
    const ordem = Number(body.ordem ?? 0);
    const destaque = Boolean(body.destaque);

    if (!eventoId || Number.isNaN(eventoId)) {
      return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
    }

    if (!imagemUrl) {
      return NextResponse.json(
        { error: "Informe a URL da imagem." },
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

    if (destaque) {
      const { error: clearError } = await supabase
        .from("galeria_evento")
        .update({ destaque: false })
        .eq("evento_id", eventoId);

      if (clearError) {
        console.error("Erro ao limpar destaque da galeria:", clearError.message);
        return NextResponse.json(
          { error: "Não foi possível atualizar o destaque da galeria." },
          { status: 500 },
        );
      }
    }

    if (id) {
      const { data, error } = await supabase
        .from("galeria_evento")
        .update({
          imagem_url: imagemUrl,
          ordem,
          destaque,
        })
        .eq("id", id)
        .eq("evento_id", eventoId)
        .select("*")
        .single();

      if (error) {
        console.error("Erro ao atualizar imagem da galeria:", error.message);
        return NextResponse.json(
          { error: "Não foi possível atualizar a imagem." },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { success: true, message: "Imagem atualizada com sucesso.", data },
        { status: 200 },
      );
    }

    const { data, error } = await supabase
      .from("galeria_evento")
      .insert([
        {
          evento_id: eventoId,
          imagem_url: imagemUrl,
          ordem,
          destaque,
        },
      ])
      .select("*")
      .single();

    if (error) {
      console.error("Erro ao cadastrar imagem da galeria:", error.message);
      return NextResponse.json(
        { error: "Não foi possível cadastrar a imagem." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, message: "Imagem cadastrada com sucesso.", data },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro inesperado ao salvar imagem da galeria:", error);

    return NextResponse.json(
      { error: "Erro inesperado ao salvar a imagem." },
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
      .from("galeria_evento")
      .delete()
      .eq("id", id)
      .eq("evento_id", eventoId);

    if (error) {
      console.error("Erro ao excluir imagem da galeria:", error.message);
      return NextResponse.json(
        { error: "Não foi possível excluir a imagem." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, message: "Imagem excluída com sucesso." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro inesperado ao excluir imagem da galeria:", error);

    return NextResponse.json(
      { error: "Erro inesperado ao excluir a imagem." },
      { status: 500 },
    );
  }
}
