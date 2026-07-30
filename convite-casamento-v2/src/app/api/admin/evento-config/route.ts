import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { requireAdminApiUser } from "../../../../lib/supabase/auth";
import { patchEventConfig } from "../../../../lib/supabase/patch-event-config";
import {
  booleanValue,
  boundedInteger,
  nullableText,
  parsePatchEnvelope,
  PatchValidationError,
  requiredText,
} from "../../../../lib/utils/config-patch";
import { normalizeMapsLinkForStorage } from "../../../../lib/utils/maps";
import { validateReservedDressColors } from "../../../../lib/utils/reserved-colors";

const eventFields = [
  "slug",
  "nome_evento",
  "nome_casal",
  "data_evento",
  "horario_evento",
  "local_cerimonia",
  "link_maps_cerimonia",
  "local_recepcao",
  "link_maps_recepcao",
  "ativo",
] as const;

const configFields = [
  "mensagem_confirmacao",
  "data_limite_confirmacao",
  "chave_pix",
  "qr_pix_url",
  "dress_code_titulo",
  "dress_code_descricao",
  "dress_code_homens",
  "dress_code_mulheres",
  "dress_code_cores",
  "dress_code_cores_paleta",
  "dress_code_observacao",
  "max_acompanhantes",
] as const;

const allFields = [...eventFields, ...configFields] as const;
const eventFieldSet = new Set<string>(eventFields);
const configFieldSet = new Set<string>(configFields);

function dateValue(value: unknown, field: string) {
  const text = nullableText(value, field);
  if (text && !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new PatchValidationError(`${field} possui uma data invÃ¡lida.`);
  }
  return text;
}

function timeValue(value: unknown, field: string) {
  const text = nullableText(value, field);
  if (text && !/^\d{2}:\d{2}(?::\d{2})?$/.test(text)) {
    throw new PatchValidationError(`${field} possui um horÃ¡rio invÃ¡lido.`);
  }
  return text;
}

export async function PATCH(request: Request) {
  const authError = await requireAdminApiUser();
  if (authError) return authError;

  try {
    const { eventoId, expectedUpdatedAt, fields: received } =
      parsePatchEnvelope(await request.json(), allFields);
    const supabase = createAdminClient();
    const [{ data: evento, error: eventoReadError }, { data: currentConfig, error: configReadError }] =
      await Promise.all([
        supabase.from("eventos").select("*").eq("id", eventoId).maybeSingle(),
        supabase
          .from("configuracoes_evento")
          .select("*")
          .eq("evento_id", eventoId)
          .maybeSingle(),
      ]);

    if (eventoReadError) throw eventoReadError;
    if (configReadError) throw configReadError;
    if (!evento) {
      return NextResponse.json({ error: "Evento nÃ£o encontrado." }, { status: 404 });
    }

    const hasConfigChanges = Object.keys(received).some((field) =>
      configFieldSet.has(field),
    );
    if (
      hasConfigChanges &&
      expectedUpdatedAt &&
      currentConfig?.updated_at !== expectedUpdatedAt
    ) {
      return NextResponse.json(
        {
          error:
            "As configuraÃ§Ãµes foram alteradas em outra aba. Recarregue antes de salvar novamente.",
        },
        { status: 409 },
      );
    }

    const eventPatch: Record<string, unknown> = {};
    const configPatch: Record<string, unknown> = {};

    for (const [field, value] of Object.entries(received)) {
      if (eventFieldSet.has(field)) {
        if (field === "slug") {
          const slug = requiredText(value, "Slug").toLowerCase();
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
            throw new PatchValidationError(
              "Slug deve conter apenas letras minÃºsculas, nÃºmeros e hÃ­fens.",
            );
          }
          eventPatch[field] = slug;
        } else if (field === "nome_evento" || field === "nome_casal") {
          eventPatch[field] = requiredText(value, field);
        } else if (field === "data_evento") {
          eventPatch[field] = dateValue(value, field);
        } else if (field === "horario_evento") {
          eventPatch[field] = timeValue(value, field);
        } else if (field === "ativo") {
          eventPatch[field] = booleanValue(value, field);
        } else if (!field.startsWith("link_maps_")) {
          eventPatch[field] = nullableText(value, field);
        }
      } else if (field === "data_limite_confirmacao") {
        configPatch[field] = dateValue(value, field);
      } else if (field === "max_acompanhantes") {
        configPatch[field] = boundedInteger(value, field, 0, 10);
      } else if (field === "dress_code_cores_paleta") {
        try {
          configPatch[field] = validateReservedDressColors(value);
        } catch (validationError) {
          throw new PatchValidationError(
            validationError instanceof Error
              ? validationError.message
              : "Paleta de cores reservadas inválida.",
          );
        }
      } else {
        configPatch[field] = nullableText(value, field);
      }
    }

    for (const suffix of ["cerimonia", "recepcao"] as const) {
      const linkField = `link_maps_${suffix}`;
      const localField = `local_${suffix}`;
      if (
        Object.prototype.hasOwnProperty.call(received, linkField) ||
        Object.prototype.hasOwnProperty.call(received, localField)
      ) {
        eventPatch[linkField] = normalizeMapsLinkForStorage(
          Object.prototype.hasOwnProperty.call(received, linkField)
            ? (received[linkField] as string | null)
            : evento[linkField],
          Object.prototype.hasOwnProperty.call(received, localField)
            ? (eventPatch[localField] as string | null)
            : evento[localField],
        );
      }
    }

    let updatedEvento = evento;
    if (Object.keys(eventPatch).length) {
      const { data, error } = await supabase
        .from("eventos")
        .update(eventPatch)
        .eq("id", eventoId)
        .select("*")
        .single();
      if (error) throw error;
      updatedEvento = data;
    }

    let updatedConfig = currentConfig;
    if (Object.keys(configPatch).length) {
      const result = await patchEventConfig(
        supabase,
        eventoId,
        configPatch,
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
      updatedConfig = result.data;
    }

    revalidatePath(`/evento/${evento.slug}`);
    revalidatePath(`/evento/${updatedEvento.slug}`);
    revalidatePath(`/admin/eventos/${evento.slug}/configuracoes`);

    return NextResponse.json({
      success: true,
      message: "ConfiguraÃ§Ãµes salvas com sucesso.",
      evento: updatedEvento,
      configuracoes: updatedConfig,
    });
  } catch (error) {
    if (error instanceof PatchValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Erro inesperado ao salvar configuraÃ§Ãµes:", error);
    return NextResponse.json(
      { error: "NÃ£o foi possÃ­vel salvar as configuraÃ§Ãµes do evento." },
      { status: 500 },
    );
  }
}
