import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { requireAdminApiUser } from "../../../../lib/supabase/auth";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const ALLOWED_FOLDERS = new Set([
  "galeria",
  "hero",
  "historia",
  "pix",
  "presentes",
  "mensagens",
]);
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function isImageFile(file: File) {
  return ALLOWED_IMAGE_TYPES.includes(file.type);
}

function isVideoFile(file: File) {
  return ALLOWED_VIDEO_TYPES.includes(file.type);
}

function getFileCategory(file: File) {
  if (isImageFile(file)) return "image";
  if (isVideoFile(file)) return "video";
  return null;
}

export async function POST(request: Request) {
  const authError = await requireAdminApiUser();
  if (authError) return authError;

  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const eventoId = Number(formData.get("eventoId"));
    const folder = String(formData.get("folder") || "").trim();
    const mediaType = String(formData.get("mediaType") || "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Arquivo inválido." },
        { status: 400 },
      );
    }

    if (!eventoId || Number.isNaN(eventoId)) {
      return NextResponse.json(
        { error: "Evento inválido." },
        { status: 400 },
      );
    }

    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json(
        { error: "Pasta de upload inválida." },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "O arquivo deve ter no máximo 50 MB." },
        { status: 400 },
      );
    }

    const fileCategory = getFileCategory(file);

    if (!fileCategory) {
      return NextResponse.json(
        {
          error:
            "Formato não permitido. Envie imagens JPG, PNG, WEBP ou GIF, ou vídeos MP4/WEBM.",
        },
        { status: 400 },
      );
    }

    if (mediaType && mediaType !== fileCategory) {
      return NextResponse.json(
        {
          error:
            mediaType === "video"
              ? "O painel esperava um vídeo, mas o arquivo enviado não é MP4 ou WEBM."
              : "O painel esperava uma imagem, mas o arquivo enviado não é uma imagem válida.",
        },
        { status: 400 },
      );
    }

    if (fileCategory === "video" && folder !== "hero") {
      return NextResponse.json(
        {
          error: "Uploads de vídeo estão liberados apenas para o hero do evento.",
        },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const bucketName = "event-assets";
    const safeName = sanitizeFileName(file.name) || "arquivo";
    const path = `eventos/${eventoId}/${folder}/${Date.now()}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Erro no upload para o Supabase Storage:", uploadError);

      return NextResponse.json(
        { error: "Não foi possível enviar o arquivo." },
        { status: 500 },
      );
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(path);

    return NextResponse.json(
      {
        success: true,
        data: {
          path,
          publicUrl: data.publicUrl,
          contentType: file.type,
          mediaType: fileCategory,
          size: file.size,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro inesperado no upload:", error);

    return NextResponse.json(
      { error: "Erro inesperado no upload." },
      { status: 500 },
    );
  }
}
