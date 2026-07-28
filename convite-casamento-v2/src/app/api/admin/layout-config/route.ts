import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminApiUser } from "../../../../lib/supabase/auth";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { patchEventConfig } from "../../../../lib/supabase/patch-event-config";
import {
  boundedInteger,
  enumValue,
  hexColor,
  parsePatchEnvelope,
  PatchValidationError,
  safeMediaUrl,
} from "../../../../lib/utils/config-patch";

const fields = [
  "cor_primaria",
  "cor_secundaria",
  "cor_acento",
  "cor_fundo",
  "cor_superficie",
  "modelo_layout",
  "hero_background_type",
  "hero_background_url",
  "hero_overlay_opacity",
] as const;

const colorFields = new Set([
  "cor_primaria",
  "cor_secundaria",
  "cor_acento",
  "cor_fundo",
  "cor_superficie",
]);

export async function PATCH(request: Request) {
  const authError = await requireAdminApiUser();
  if (authError) return authError;

  try {
    const { eventoId, expectedUpdatedAt, fields: received } =
      parsePatchEnvelope(await request.json(), fields);
    const supabase = createAdminClient();
    const { data: evento, error: eventoError } = await supabase
      .from("eventos")
      .select("slug")
      .eq("id", eventoId)
      .maybeSingle();

    if (eventoError) throw eventoError;
    if (!evento) {
      return NextResponse.json({ error: "Evento nÃ£o encontrado." }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(received)) {
      if (colorFields.has(field)) patch[field] = hexColor(value, field);
      else if (field === "modelo_layout") {
        patch[field] = enumValue(value, field, [
          "classic",
          "romantic",
          "minimal",
          "editorial",
          "photographic",
          "contemporary",
        ]);
      } else if (field === "hero_background_type") {
        patch[field] = enumValue(value, field, ["none", "image", "video"]);
      } else if (field === "hero_background_url") {
        patch[field] = safeMediaUrl(value, field);
      } else if (field === "hero_overlay_opacity") {
        patch[field] = boundedInteger(value, field, 0, 90);
      }
    }

    const result = await patchEventConfig(
      supabase,
      eventoId,
      patch,
      expectedUpdatedAt,
    );

    if (result.conflict) {
      return NextResponse.json(
        {
          error:
            "As configuraÃ§Ãµes foram alteradas em outra aba. Recarregue antes de salvar novamente.",
        },
        { status: 409 },
      );
    }

    revalidatePath(`/evento/${evento.slug}`);
    revalidatePath(`/admin/eventos/${evento.slug}/layout`);

    return NextResponse.json({
      success: true,
      message: "Layout salvo com sucesso.",
      configuracoes: result.data,
    });
  } catch (error) {
    if (error instanceof PatchValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Erro ao salvar layout do evento:", error);
    return NextResponse.json(
      { error: "NÃ£o foi possÃ­vel salvar as configuraÃ§Ãµes de layout." },
      { status: 500 },
    );
  }
}
