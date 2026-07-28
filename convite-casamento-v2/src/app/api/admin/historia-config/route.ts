import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { requireAdminApiUser } from "../../../../lib/supabase/auth";
import { patchEventConfig } from "../../../../lib/supabase/patch-event-config";
import {
  booleanValue,
  enumValue,
  nullableText,
  parsePatchEnvelope,
  PatchValidationError,
} from "../../../../lib/utils/config-patch";

const fields = [
  "historia_ativa",
  "historia_titulo",
  "historia_descricao",
  "historia_modelo_grid",
] as const;

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
      if (field === "historia_ativa") {
        patch[field] = booleanValue(value, field);
      } else if (field === "historia_modelo_grid") {
        patch[field] = enumValue(value, field, [
          "editorial",
          "mosaico",
          "timeline",
        ]);
      } else {
        patch[field] = nullableText(value, field);
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
            "A histÃ³ria foi alterada em outra aba. Recarregue antes de salvar novamente.",
        },
        { status: 409 },
      );
    }

    revalidatePath(`/evento/${evento.slug}`);
    revalidatePath(`/admin/eventos/${evento.slug}/layout`);

    return NextResponse.json({
      success: true,
      message: "ConfiguraÃ§Ãµes da histÃ³ria salvas com sucesso.",
      configuracoes: result.data,
    });
  } catch (error) {
    if (error instanceof PatchValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Erro inesperado ao salvar configuraÃ§Ã£o da histÃ³ria:", error);
    return NextResponse.json(
      { error: "NÃ£o foi possÃ­vel salvar as configuraÃ§Ãµes da histÃ³ria." },
      { status: 500 },
    );
  }
}
