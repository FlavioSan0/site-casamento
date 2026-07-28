import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { normalizeMapsLinkForStorage } from "../../../../lib/utils/maps";
import { requireAdminApiUser } from "../../../../lib/supabase/auth";

type EventoConfigPayload = {
  evento_id: number;
  slug: string;
  nome_evento: string;
  nome_casal: string;
  data_evento: string | null;
  horario_evento: string | null;
  local_cerimonia: string | null;
  link_maps_cerimonia: string | null;
  local_recepcao: string | null;
  link_maps_recepcao: string | null;

  mensagem_confirmacao: string | null;
  data_limite_confirmacao: string | null;

  chave_pix: string | null;
  qr_pix_url: string | null;

  dress_code_titulo: string | null;
  dress_code_descricao: string | null;
  dress_code_homens: string | null;
  dress_code_mulheres: string | null;
  dress_code_cores: string | null;
  dress_code_observacao: string | null;

  max_acompanhantes: number | null;

  cor_primaria: string | null;
  cor_secundaria: string | null;
  cor_acento: string | null;
  cor_fundo: string | null;
  cor_superficie: string | null;

  modelo_layout: string | null;

  hero_background_type: string | null;
  hero_background_url: string | null;
  hero_overlay_opacity: number | null;
};

function normalizeText(value: string | null | undefined) {
  const text = String(value || "").trim();
  return text.length > 0 ? text : null;
}

function normalizeHex(value: string | null | undefined, fallback: string) {
  const trimmed = String(value || "").trim();
  return /^#([0-9A-Fa-f]{6})$/.test(trimmed) ? trimmed : fallback;
}

function normalizeModelo(value: string | null | undefined) {
  const allowed = ["classic", "romantic", "minimal", "editorial"];
  return allowed.includes(String(value)) ? String(value) : "classic";
}

function normalizeHeroType(value: string | null | undefined) {
  const allowed = ["none", "image", "video"];
  return allowed.includes(String(value)) ? String(value) : "none";
}

export async function POST(request: Request) {
  const authError = await requireAdminApiUser();
  if (authError) return authError;

  try {
    const body = (await request.json()) as EventoConfigPayload;

    const eventoId = Number(body.evento_id);

    const maxAcompanhantesRaw = Number(body.max_acompanhantes ?? 0);
    const maxAcompanhantes = Number.isNaN(maxAcompanhantesRaw)
      ? 0
      : Math.min(Math.max(maxAcompanhantesRaw, 0), 10);

    const overlayRaw = Number(body.hero_overlay_opacity ?? 45);
    const heroOverlayOpacity = Number.isNaN(overlayRaw)
      ? 45
      : Math.min(Math.max(overlayRaw, 0), 90);

    if (!eventoId) {
      return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
    }

    if (!body.nome_evento?.trim()) {
      return NextResponse.json(
        { error: "Informe o nome do evento." },
        { status: 400 },
      );
    }

    if (!body.nome_casal?.trim()) {
      return NextResponse.json(
        { error: "Informe o nome do casal." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { error: eventoError } = await supabase
      .from("eventos")
      .update({
        slug: normalizeText(body.slug),
        nome_evento: body.nome_evento.trim(),
        nome_casal: body.nome_casal.trim(),
        data_evento: normalizeText(body.data_evento),
        horario_evento: normalizeText(body.horario_evento),
        local_cerimonia: normalizeText(body.local_cerimonia),
        link_maps_cerimonia: normalizeMapsLinkForStorage(
          body.link_maps_cerimonia,
          body.local_cerimonia,
        ),
        local_recepcao: normalizeText(body.local_recepcao),
        link_maps_recepcao: normalizeMapsLinkForStorage(
          body.link_maps_recepcao,
          body.local_recepcao,
        ),
      })
      .eq("id", eventoId);

    if (eventoError) {
      console.error("Erro ao atualizar evento:", eventoError.message);

      return NextResponse.json(
        { error: "Não foi possível atualizar os dados do evento." },
        { status: 500 },
      );
    }

    const { error: configError } = await supabase
      .from("configuracoes_evento")
      .upsert(
        {
          evento_id: eventoId,

          mensagem_confirmacao: normalizeText(body.mensagem_confirmacao),
          data_limite_confirmacao: normalizeText(body.data_limite_confirmacao),

          chave_pix: normalizeText(body.chave_pix),
          qr_pix_url: normalizeText(body.qr_pix_url),

          dress_code_titulo: normalizeText(body.dress_code_titulo),
          dress_code_descricao: normalizeText(body.dress_code_descricao),
          dress_code_homens: normalizeText(body.dress_code_homens),
          dress_code_mulheres: normalizeText(body.dress_code_mulheres),
          dress_code_cores: normalizeText(body.dress_code_cores),
          dress_code_observacao: normalizeText(body.dress_code_observacao),

          max_acompanhantes: maxAcompanhantes,

          cor_primaria: normalizeHex(body.cor_primaria, "#800000"),
          cor_secundaria: normalizeHex(body.cor_secundaria, "#08265e"),
          cor_acento: normalizeHex(body.cor_acento, "#c9a227"),
          cor_fundo: normalizeHex(body.cor_fundo, "#fffaf8"),
          cor_superficie: normalizeHex(body.cor_superficie, "#ffffff"),

          modelo_layout: normalizeModelo(body.modelo_layout),

          hero_background_type: normalizeHeroType(body.hero_background_type),
          hero_background_url: normalizeText(body.hero_background_url),
          hero_overlay_opacity: heroOverlayOpacity,
        },
        { onConflict: "evento_id" },
      );

    if (configError) {
      console.error(
        "Erro ao atualizar configurações do evento:",
        configError.message,
      );

      return NextResponse.json(
        { error: "Não foi possível atualizar as configurações do evento." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, message: "Configurações salvas com sucesso." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro inesperado ao salvar configurações:", error);

    return NextResponse.json(
      { error: "Erro inesperado ao salvar configurações." },
      { status: 500 },
    );
  }
}
