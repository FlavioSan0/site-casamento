import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { requireAdminApiUser } from "../../../../lib/supabase/auth";

type LayoutConfigPayload = {
  evento_id: number;
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
    const body = (await request.json()) as LayoutConfigPayload;

    const eventoId = Number(body.evento_id);
    const overlayRaw = Number(body.hero_overlay_opacity ?? 45);
    const heroOverlayOpacity = Number.isNaN(overlayRaw)
      ? 45
      : Math.min(Math.max(overlayRaw, 0), 90);

    if (!eventoId) {
      return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("configuracoes_evento")
      .upsert(
        {
          evento_id: eventoId,
          cor_primaria: normalizeHex(body.cor_primaria, "#800000"),
          cor_secundaria: normalizeHex(body.cor_secundaria, "#08265e"),
          cor_acento: normalizeHex(body.cor_acento, "#c9a227"),
          cor_fundo: normalizeHex(body.cor_fundo, "#fffaf8"),
          cor_superficie: normalizeHex(body.cor_superficie, "#ffffff"),
          modelo_layout: normalizeModelo(body.modelo_layout),
          hero_background_type: normalizeHeroType(body.hero_background_type),
          hero_background_url: String(body.hero_background_url || "").trim() || null,
          hero_overlay_opacity: heroOverlayOpacity,
        },
        { onConflict: "evento_id" },
      );

    if (error) {
      console.error("Erro ao salvar layout do evento:", error.message);
      return NextResponse.json(
        { error: "Não foi possível salvar as configurações de layout." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, message: "Layout salvo com sucesso." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro inesperado ao salvar layout:", error);

    return NextResponse.json(
      { error: "Erro inesperado ao salvar layout." },
      { status: 500 },
    );
  }
}
