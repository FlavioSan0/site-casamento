"use client";

import { useMemo, useState } from "react";
import { AdminBadge } from "./ui/admin-badge";
import { AdminButton } from "./ui/admin-button";
import { AdminCard, AdminCardHeader } from "./ui/admin-card";
import { AdminField } from "./ui/admin-field";
import { buildChangedPatch } from "../../lib/utils/config-patch";
import { useUnsavedChanges } from "./use-unsaved-changes";
import { EventOpening } from "../event/event-opening";

type HeroBackgroundType = "none" | "image" | "video";

type LayoutSettingsPanelProps = {
  eventoId: number;
  configuracoes: {
    cor_primaria: string | null;
    cor_secundaria: string | null;
    cor_acento: string | null;
    cor_fundo: string | null;
    cor_superficie: string | null;
    modelo_layout: string | null;
    hero_background_type: HeroBackgroundType | null;
    hero_background_url: string | null;
    hero_overlay_opacity: number | null;
    updated_at?: string | null;
  } | null;
};

type FormState = {
  cor_primaria: string;
  cor_secundaria: string;
  cor_acento: string;
  cor_fundo: string;
  cor_superficie: string;
  modelo_layout: string;
  hero_background_type: HeroBackgroundType;
  hero_background_url: string;
  hero_overlay_opacity: string;
};

const layoutFields = [
  "cor_primaria",
  "cor_secundaria",
  "cor_acento",
  "cor_fundo",
  "cor_superficie",
  "modelo_layout",
  "hero_background_type",
  "hero_background_url",
  "hero_overlay_opacity",
] as const satisfies readonly (keyof FormState)[];

const layoutOptions = [
  {
    key: "classic",
    title: "Classic",
    description: "Estrutura tradicional, elegante e equilibrada.",
  },
  {
    key: "romantic",
    title: "Romantic",
    description: "Visual mais suave, delicado e emocional.",
  },
  {
    key: "minimal",
    title: "Minimal",
    description: "Mais limpo, direto e moderno.",
  },
  {
    key: "editorial",
    title: "Editorial",
    description: "Mais impacto visual e melhor uso de mídia no hero.",
  },
  {
    key: "photographic",
    title: "FotogrÃ¡fico",
    description: "Hero dominante e imagens em primeiro plano.",
  },
  {
    key: "contemporary",
    title: "ContemporÃ¢neo",
    description: "Grid limpo, cards equilibrados e tipografia moderna.",
  },
] as const;

const colorPresets = [
  {
    key: "marsala-classic",
    title: "Marsala Clássico",
    colors: {
      cor_primaria: "#800000",
      cor_secundaria: "#08265e",
      cor_acento: "#c9a227",
      cor_fundo: "#fffaf8",
      cor_superficie: "#ffffff",
      modelo_layout: "classic",
    },
  },
  {
    key: "rose-romantic",
    title: "Romântico Rosé",
    colors: {
      cor_primaria: "#A64D79",
      cor_secundaria: "#5E3B4D",
      cor_acento: "#D9B26F",
      cor_fundo: "#FFF8FB",
      cor_superficie: "#FFFFFF",
      modelo_layout: "romantic",
    },
  },
  {
    key: "clean-minimal",
    title: "Minimal Clean",
    colors: {
      cor_primaria: "#1F2937",
      cor_secundaria: "#0F172A",
      cor_acento: "#94A3B8",
      cor_fundo: "#F8FAFC",
      cor_superficie: "#FFFFFF",
      modelo_layout: "minimal",
    },
  },
  {
    key: "night-editorial",
    title: "Editorial Noturno",
    colors: {
      cor_primaria: "#0F172A",
      cor_secundaria: "#111827",
      cor_acento: "#D4AF37",
      cor_fundo: "#F5F7FB",
      cor_superficie: "#FFFFFF",
      modelo_layout: "editorial",
    },
  },
  {
    key: "sage-contemporary",
    title: "Verde SÃ¡lvia",
    colors: {
      cor_primaria: "#657A68",
      cor_secundaria: "#33443A",
      cor_acento: "#B58B5A",
      cor_fundo: "#F5F3EC",
      cor_superficie: "#FFFFFF",
      modelo_layout: "contemporary",
    },
  },
  {
    key: "terracotta-photographic",
    title: "Terracota",
    colors: {
      cor_primaria: "#A9573F",
      cor_secundaria: "#492F2A",
      cor_acento: "#D5A36A",
      cor_fundo: "#FFF8F2",
      cor_superficie: "#FFFFFF",
      modelo_layout: "photographic",
    },
  },
  {
    key: "soft-blue-editorial",
    title: "Azul Suave",
    colors: {
      cor_primaria: "#58758F",
      cor_secundaria: "#263B4D",
      cor_acento: "#C5A46D",
      cor_fundo: "#F4F8FA",
      cor_superficie: "#FFFFFF",
      modelo_layout: "editorial",
    },
  },
] as const;

function normalizeHexInput(value: string, fallback: string) {
  const cleaned = String(value || "")
    .trim()
    .replace(/[^0-9a-fA-F#]/g, "")
    .replace(/^([^#])/, "#$1")
    .slice(0, 7);

  if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
    return cleaned.toUpperCase();
  }

  return fallback.toUpperCase();
}

function sanitizeHexDraft(value: string) {
  const raw = String(value || "").trim().replace(/[^0-9a-fA-F#]/g, "");

  if (!raw) return "#";

  const withoutExtraHashes = raw.startsWith("#")
    ? `#${raw.slice(1).replace(/#/g, "")}`
    : `#${raw.replace(/#/g, "")}`;

  return withoutExtraHashes.slice(0, 7).toUpperCase();
}

function getUploadAcceptByHeroType(type: HeroBackgroundType) {
  if (type === "video") return "video/mp4,video/webm";
  if (type === "image") return "image/*";
  return "image/*,video/mp4,video/webm";
}

function getUploadHintByHeroType(type: HeroBackgroundType) {
  if (type === "video") {
    return "Envie um vídeo em MP4 ou WEBM. Prefira arquivos leves e otimizados para web.";
  }

  if (type === "image") {
    return "Envie uma imagem horizontal em boa qualidade. O upload preencherá a URL automaticamente.";
  }

  return "Escolha primeiro se deseja usar imagem ou vídeo no fundo do hero.";
}

function detectHeroTypeFromFile(file: File): HeroBackgroundType | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "video/mp4" || file.type === "video/webm") return "video";
  return null;
}

async function parseJsonResponse(response: Response) {
  const rawText = await response.text();

  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error(`Resposta inválida do servidor: ${rawText.slice(0, 180)}`);
  }
}

const MAX_SUPABASE_FREE_UPLOAD_MB = 50;
const MAX_HERO_IMAGE_WIDTH = 1920;
const HERO_IMAGE_QUALITY = 0.82;

function bytesToMb(bytes: number) {
  return bytes / 1024 / 1024;
}

function formatMb(bytes: number) {
  return `${bytesToMb(bytes).toFixed(1)} MB`;
}

async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const imageBitmap = await createImageBitmap(file);

  const scale = Math.min(1, MAX_HERO_IMAGE_WIDTH / imageBitmap.width);
  const targetWidth = Math.round(imageBitmap.width * scale);
  const targetHeight = Math.round(imageBitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    return file;
  }

  context.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", HERO_IMAGE_QUALITY);
  });

  if (!blob) {
    return file;
  }

  const compressedName = file.name.replace(/\.[^.]+$/, ".webp");

  return new File([blob], compressedName, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

function normalizeForm(form: FormState): FormState {
  return {
    ...form,
    cor_primaria: normalizeHexInput(form.cor_primaria, "#800000"),
    cor_secundaria: normalizeHexInput(form.cor_secundaria, "#08265E"),
    cor_acento: normalizeHexInput(form.cor_acento, "#C9A227"),
    cor_fundo: normalizeHexInput(form.cor_fundo, "#FFFAF8"),
    cor_superficie: normalizeHexInput(form.cor_superficie, "#FFFFFF"),
    hero_background_url:
      form.hero_background_type === "none"
        ? ""
        : form.hero_background_url.trim(),
    hero_overlay_opacity: String(
      Math.min(Math.max(Number(form.hero_overlay_opacity || 45), 0), 90),
    ),
  };
}

export function LayoutSettingsPanel({
  eventoId,
  configuracoes,
}: LayoutSettingsPanelProps) {
  const initialForm: FormState = {
    cor_primaria: configuracoes?.cor_primaria || "#800000",
    cor_secundaria: configuracoes?.cor_secundaria || "#08265E",
    cor_acento: configuracoes?.cor_acento || "#C9A227",
    cor_fundo: configuracoes?.cor_fundo || "#FFFAF8",
    cor_superficie: configuracoes?.cor_superficie || "#FFFFFF",
    modelo_layout: configuracoes?.modelo_layout || "classic",
    hero_background_type: configuracoes?.hero_background_type || "none",
    hero_background_url: configuracoes?.hero_background_url || "",
    hero_overlay_opacity: String(configuracoes?.hero_overlay_opacity ?? 45),
  };
  const [form, setForm] = useState<FormState>(initialForm);
  const [savedForm, setSavedForm] = useState<FormState>(initialForm);
  const [configUpdatedAt, setConfigUpdatedAt] = useState(
    configuracoes?.updated_at || "",
  );
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [openingPreviewKey, setOpeningPreviewKey] = useState(0);

  const [loading, setLoading] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "">("");
  const normalizedForm = normalizeForm(form);
  const changedFields = buildChangedPatch(
    normalizeForm(savedForm),
    normalizedForm,
    layoutFields,
  );
  const hasChanges = Object.keys(changedFields).length > 0;
  useUnsavedChanges(hasChanges);

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleHeroTypeChange(value: HeroBackgroundType) {
    setForm((prev) => ({
      ...prev,
      hero_background_type: value,
      hero_background_url: value === "none" ? "" : prev.hero_background_url,
    }));
  }

  function handleColorTextChange(
    field: keyof Pick<
      FormState,
      | "cor_primaria"
      | "cor_secundaria"
      | "cor_acento"
      | "cor_fundo"
      | "cor_superficie"
    >,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: sanitizeHexDraft(value),
    }));
  }

  function handleColorPickerChange(
    field: keyof Pick<
      FormState,
      | "cor_primaria"
      | "cor_secundaria"
      | "cor_acento"
      | "cor_fundo"
      | "cor_superficie"
    >,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: normalizeHexInput(value, prev[field]),
    }));
  }

  function applyPreset(preset: (typeof colorPresets)[number]) {
    setForm((prev) => ({
      ...prev,
      ...preset.colors,
    }));

    setFeedback(`Preset "${preset.title}" aplicado.`);
    setFeedbackType("success");
  }

  function discardChanges() {
    setForm(savedForm);
    setFeedback("AlteraÃ§Ãµes locais descartadas.");
    setFeedbackType("success");
  }

  function restoreDefaults() {
    if (
      !window.confirm(
        "Restaurar somente as opÃ§Ãµes visuais para o padrÃ£o? A alteraÃ§Ã£o ainda precisarÃ¡ ser salva.",
      )
    ) {
      return;
    }

    setForm((current) => ({
      ...current,
      cor_primaria: "#800000",
      cor_secundaria: "#08265E",
      cor_acento: "#C9A227",
      cor_fundo: "#FFFAF8",
      cor_superficie: "#FFFFFF",
      modelo_layout: "classic",
      hero_background_type: "none",
      hero_background_url: "",
      hero_overlay_opacity: "45",
    }));
    setFeedback("PadrÃ£o aplicado localmente. Salve para confirmar.");
    setFeedbackType("success");
  }

  async function handleHeroUpload(file: File) {
  try {
    setUploadingHero(true);
    setFeedback("");
    setFeedbackType("");

    const detectedType = detectHeroTypeFromFile(file);

    if (!detectedType) {
      throw new Error("Formato inválido. Envie uma imagem, MP4 ou WEBM.");
    }

    if (form.hero_background_type === "none") {
      throw new Error("Escolha primeiro se o fundo será imagem ou vídeo.");
    }

    if (form.hero_background_type !== detectedType) {
      throw new Error(
        form.hero_background_type === "video"
          ? "Você selecionou vídeo, mas o arquivo enviado não é um vídeo MP4 ou WEBM."
          : "Você selecionou imagem, mas o arquivo enviado não é uma imagem.",
      );
    }

    let uploadFile = file;

    if (detectedType === "image") {
      uploadFile = await compressImageFile(file);
    }

    if (
      detectedType === "video" &&
      bytesToMb(uploadFile.size) > MAX_SUPABASE_FREE_UPLOAD_MB
    ) {
      throw new Error(
        `O vídeo tem ${formatMb(uploadFile.size)}. No plano atual do Supabase, envie um vídeo com até ${MAX_SUPABASE_FREE_UPLOAD_MB} MB. Comprima o vídeo antes de enviar.`,
      );
    }

    if (
      detectedType === "image" &&
      bytesToMb(uploadFile.size) > MAX_SUPABASE_FREE_UPLOAD_MB
    ) {
      throw new Error(
        `Mesmo após a compressão, a imagem ficou com ${formatMb(uploadFile.size)}. Envie uma imagem menor.`,
      );
    }

    const body = new FormData();
    body.append("file", uploadFile);
    body.append("eventoId", String(eventoId));
    body.append("folder", "hero");
    body.append("mediaType", detectedType);

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body,
    });

    const result = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(result?.error || "Não foi possível enviar a mídia.");
    }

    setForm((prev) => ({
      ...prev,
      hero_background_url: result.data.publicUrl,
    }));

    const originalSize = formatMb(file.size);
    const finalSize = formatMb(uploadFile.size);

    setFeedback(
      detectedType === "video"
        ? `Vídeo do hero enviado com sucesso. Tamanho: ${finalSize}.`
        : `Imagem do hero enviada com sucesso. Original: ${originalSize}. Otimizada: ${finalSize}.`,
    );

    setFeedbackType("success");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível enviar a mídia.";

    setFeedback(message);
    setFeedbackType("error");
  } finally {
    setUploadingHero(false);
  }
}

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const overlay = Number(form.hero_overlay_opacity || 45);

    if (Number.isNaN(overlay) || overlay < 0 || overlay > 90) {
      setFeedback("Defina um overlay entre 0 e 90.");
      setFeedbackType("error");
      return;
    }

    if (
      form.hero_background_type !== "none" &&
      !form.hero_background_url.trim()
    ) {
      setFeedback("Envie ou informe a URL da mídia do hero antes de salvar.");
      setFeedbackType("error");
      return;
    }

    try {
      setLoading(true);
      setFeedback("");
      setFeedbackType("");

      const response = await fetch("/api/admin/layout-config", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          evento_id: eventoId,
          expected_updated_at: configUpdatedAt || undefined,
          ...changedFields,
          ...(Object.prototype.hasOwnProperty.call(
            changedFields,
            "hero_overlay_opacity",
          )
            ? { hero_overlay_opacity: overlay }
            : {}),
        }),
      });

      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível salvar o layout.");
      }

      const config = result.configuracoes || {};
      const saved = normalizeForm({
        ...form,
        ...config,
        hero_overlay_opacity: String(
          config.hero_overlay_opacity ?? normalizedForm.hero_overlay_opacity,
        ),
      });
      setForm(saved);
      setSavedForm(saved);
      setConfigUpdatedAt(config.updated_at || configUpdatedAt);

      setFeedback("Configurações visuais salvas com sucesso.");
      setFeedbackType("success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível salvar.";
      setFeedback(message);
      setFeedbackType("error");
    } finally {
      setLoading(false);
    }
  }

  const showHeroPreview =
    form.hero_background_type !== "none" && form.hero_background_url.trim();

  const overlayValue = useMemo(
    () => Math.min(Math.max(Number(form.hero_overlay_opacity || 45), 0), 90),
    [form.hero_overlay_opacity],
  );

  const uploadAccept = getUploadAcceptByHeroType(form.hero_background_type);
  const uploadHint = getUploadHintByHeroType(form.hero_background_type);

  return (
    <form className="admin-form-stack" onSubmit={handleSubmit}>
      <fieldset className="admin-form-fieldset" disabled={loading}>
      <AdminCard>
        <AdminCardHeader
          title="Presets rápidos"
          description="Aplique uma base pronta e depois ajuste os detalhes finos."
        />

        <div className="admin-preset-grid">
          {colorPresets.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className="admin-preset-card"
              onClick={() => applyPreset(preset)}
            >
              <div className="admin-preset-card__swatches">
                <span style={{ background: preset.colors.cor_primaria }} />
                <span style={{ background: preset.colors.cor_secundaria }} />
                <span style={{ background: preset.colors.cor_acento }} />
                <span style={{ background: preset.colors.cor_fundo }} />
                <span style={{ background: preset.colors.cor_superficie }} />
              </div>

              <div className="admin-preset-card__content">
                <strong>{preset.title}</strong>
                <span>Modelo base: {preset.colors.modelo_layout}</span>
              </div>
            </button>
          ))}
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Paleta visual"
          description="Defina as cores base do painel e da página pública."
        />

        <div className="admin-form-grid">
          <AdminField label="Cor primária" htmlFor="cor_primaria_text">
            <div className="admin-color-input-group">
              <input
                id="cor_primaria_picker"
                type="color"
                value={normalizeHexInput(form.cor_primaria, "#800000")}
                onChange={(e) =>
                  handleColorPickerChange("cor_primaria", e.target.value)
                }
                className="admin-color-input-group__picker"
              />
              <input
                id="cor_primaria_text"
                type="text"
                value={form.cor_primaria}
                onChange={(e) =>
                  handleColorTextChange("cor_primaria", e.target.value)
                }
                placeholder="#800000"
                pattern="#[0-9A-Fa-f]{6}"
                maxLength={7}
                className="admin-color-input-group__text"
              />
            </div>
          </AdminField>

          <AdminField label="Cor secundária" htmlFor="cor_secundaria_text">
            <div className="admin-color-input-group">
              <input
                id="cor_secundaria_picker"
                type="color"
                value={normalizeHexInput(form.cor_secundaria, "#08265E")}
                onChange={(e) =>
                  handleColorPickerChange("cor_secundaria", e.target.value)
                }
                className="admin-color-input-group__picker"
              />
              <input
                id="cor_secundaria_text"
                type="text"
                value={form.cor_secundaria}
                onChange={(e) =>
                  handleColorTextChange("cor_secundaria", e.target.value)
                }
                placeholder="#08265E"
                pattern="#[0-9A-Fa-f]{6}"
                maxLength={7}
                className="admin-color-input-group__text"
              />
            </div>
          </AdminField>

          <AdminField label="Cor de acento" htmlFor="cor_acento_text">
            <div className="admin-color-input-group">
              <input
                id="cor_acento_picker"
                type="color"
                value={normalizeHexInput(form.cor_acento, "#C9A227")}
                onChange={(e) =>
                  handleColorPickerChange("cor_acento", e.target.value)
                }
                className="admin-color-input-group__picker"
              />
              <input
                id="cor_acento_text"
                type="text"
                value={form.cor_acento}
                onChange={(e) =>
                  handleColorTextChange("cor_acento", e.target.value)
                }
                placeholder="#C9A227"
                pattern="#[0-9A-Fa-f]{6}"
                maxLength={7}
                className="admin-color-input-group__text"
              />
            </div>
          </AdminField>

          <AdminField label="Cor de fundo" htmlFor="cor_fundo_text">
            <div className="admin-color-input-group">
              <input
                id="cor_fundo_picker"
                type="color"
                value={normalizeHexInput(form.cor_fundo, "#FFFAF8")}
                onChange={(e) =>
                  handleColorPickerChange("cor_fundo", e.target.value)
                }
                className="admin-color-input-group__picker"
              />
              <input
                id="cor_fundo_text"
                type="text"
                value={form.cor_fundo}
                onChange={(e) =>
                  handleColorTextChange("cor_fundo", e.target.value)
                }
                placeholder="#FFFAF8"
                pattern="#[0-9A-Fa-f]{6}"
                maxLength={7}
                className="admin-color-input-group__text"
              />
            </div>
          </AdminField>

          <AdminField label="Cor de superfície" htmlFor="cor_superficie_text">
            <div className="admin-color-input-group">
              <input
                id="cor_superficie_picker"
                type="color"
                value={normalizeHexInput(form.cor_superficie, "#FFFFFF")}
                onChange={(e) =>
                  handleColorPickerChange("cor_superficie", e.target.value)
                }
                className="admin-color-input-group__picker"
              />
              <input
                id="cor_superficie_text"
                type="text"
                value={form.cor_superficie}
                onChange={(e) =>
                  handleColorTextChange("cor_superficie", e.target.value)
                }
                placeholder="#FFFFFF"
                pattern="#[0-9A-Fa-f]{6}"
                maxLength={7}
                className="admin-color-input-group__text"
              />
            </div>
          </AdminField>
        </div>

        <div className="admin-preview-toolbar" aria-label="Tamanho da prÃ©via">
          <button
            type="button"
            aria-pressed={previewMode === "desktop"}
            onClick={() => setPreviewMode("desktop")}
          >
            Desktop
          </button>
          <button
            type="button"
            aria-pressed={previewMode === "mobile"}
            onClick={() => setPreviewMode("mobile")}
          >
            Mobile
          </button>
          <button
            type="button"
            onClick={() => setOpeningPreviewKey((current) => current + 1)}
          >
            Visualizar abertura
          </button>
        </div>

        <div
          className={`admin-theme-preview admin-theme-preview--enhanced admin-theme-preview--${previewMode}`}
        >
          <div
            className="admin-theme-preview__canvas"
            style={{ background: normalizeHexInput(form.cor_fundo, "#FFFAF8") }}
          >
            <div
              className="admin-theme-preview__topbar"
              style={{
                background: normalizeHexInput(form.cor_secundaria, "#08265E"),
              }}
            />
            <div className="admin-theme-preview__body">
              <div
                className="admin-theme-preview__hero"
                style={{
                  background: normalizeHexInput(form.cor_primaria, "#800000"),
                }}
              />
              <div className="admin-theme-preview__cards">
                <div
                  className="admin-theme-preview__card"
                  style={{
                    background: normalizeHexInput(
                      form.cor_superficie,
                      "#FFFFFF",
                    ),
                  }}
                />
                <div
                  className="admin-theme-preview__card"
                  style={{
                    background: normalizeHexInput(
                      form.cor_superficie,
                      "#FFFFFF",
                    ),
                  }}
                />
              </div>
              <div
                className="admin-theme-preview__accent-line"
                style={{
                  background: normalizeHexInput(form.cor_acento, "#C9A227"),
                }}
              />
            </div>
          </div>
        </div>

        {openingPreviewKey > 0 ? (
          <div
            className="admin-opening-preview-shell"
            style={
              {
                "--theme-primary": normalizeHexInput(
                  form.cor_primaria,
                  "#800000",
                ),
                "--theme-secondary": normalizeHexInput(
                  form.cor_secundaria,
                  "#08265E",
                ),
                "--theme-accent": normalizeHexInput(
                  form.cor_acento,
                  "#C9A227",
                ),
                "--theme-surface": normalizeHexInput(
                  form.cor_superficie,
                  "#FFFFFF",
                ),
              } as React.CSSProperties
            }
          >
            <EventOpening
              key={openingPreviewKey}
              eventKey="admin-preview"
              coupleNames="Flávio & Ana"
              eventDate="15 de agosto de 2026"
              preview
              onComplete={() => setOpeningPreviewKey(0)}
            >
              {null}
            </EventOpening>
          </div>
        ) : (
          <div className="admin-opening-preview-thumbnail" aria-hidden="true">
            <span />
            <strong>Abertura com envelope</strong>
          </div>
        )}
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Modelo visual"
          description="Escolha a base estética que será usada no site do evento."
        />

        <div className="admin-layout-picker">
          {layoutOptions.map((item) => {
            const active = form.modelo_layout === item.key;

            return (
              <button
                key={item.key}
                type="button"
                className={`admin-layout-option ${
                  active ? "admin-layout-option--active" : ""
                }`}
                onClick={() => handleChange("modelo_layout", item.key)}
              >
                <div
                  className={`admin-layout-option__preview admin-layout-option__preview--${item.key}`}
                >
                  <div />
                  <div />
                  <div />
                </div>

                <div className="admin-layout-option__content">
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </div>

                {active ? <AdminBadge variant="success">Ativo</AdminBadge> : null}
              </button>
            );
          })}
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Hero com foto ou vídeo"
          description="Configure um fundo de impacto para o topo do site."
        />

        <div className="admin-form-grid">
          <AdminField
            label="Tipo de fundo"
            htmlFor="hero_background_type"
            hint="Escolha o tipo antes de enviar a mídia."
          >
            <select
              id="hero_background_type"
              value={form.hero_background_type}
              onChange={(e) =>
                handleHeroTypeChange(e.target.value as HeroBackgroundType)
              }
            >
              <option value="none">Sem mídia de fundo</option>
              <option value="image">Imagem de fundo</option>
              <option value="video">Vídeo de fundo</option>
            </select>
          </AdminField>

          <AdminField
            label="Overlay escuro"
            htmlFor="hero_overlay_opacity"
            hint="Valor entre 0 e 90 para dar contraste ao texto."
          >
            <div className="admin-range-field">
              <input
                id="hero_overlay_opacity"
                type="range"
                min={0}
                max={90}
                step={1}
                value={form.hero_overlay_opacity}
                onChange={(e) =>
                  handleChange("hero_overlay_opacity", e.target.value)
                }
              />
              <output htmlFor="hero_overlay_opacity">
                {form.hero_overlay_opacity}%
              </output>
            </div>
          </AdminField>

          <div className="admin-form-grid-full">
            <AdminField
              label="Upload da mídia de fundo"
              htmlFor="hero_background_upload"
              hint={uploadHint}
            >
              <input
                id="hero_background_upload"
                type="file"
                accept={uploadAccept}
                disabled={form.hero_background_type === "none" || uploadingHero}
                onChange={(e) => {
                  const file = e.target.files?.[0];

                  if (file) {
                    void handleHeroUpload(file);
                  }

                  e.currentTarget.value = "";
                }}
              />
            </AdminField>
          </div>

          <div className="admin-form-grid-full">
            <AdminField
              label="URL da mídia"
              htmlFor="hero_background_url"
              hint="Use uma URL pública de imagem, MP4 ou WEBM. Para vídeo, a URL precisa apontar diretamente para o arquivo."
            >
              <input
                id="hero_background_url"
                type="url"
                value={form.hero_background_url}
                onChange={(e) =>
                  handleChange("hero_background_url", e.target.value)
                }
                placeholder="Será preenchido automaticamente pelo upload"
              />
            </AdminField>
          </div>
        </div>

        {showHeroPreview ? (
          <div className="admin-hero-preview admin-hero-preview--enhanced">
            {form.hero_background_type === "video" ? (
              <video
                src={form.hero_background_url}
                className="admin-hero-preview__media"
                muted
                playsInline
                autoPlay
                loop
                controls
              />
            ) : (
              <img
                src={form.hero_background_url}
                alt="Prévia do hero"
                className="admin-hero-preview__media"
              />
            )}

            <div
              className="admin-hero-preview__overlay"
              style={{
                background: `rgba(0,0,0,${overlayValue / 100})`,
              }}
            />

            <div className="admin-hero-preview__content">
              <span>Prévia do topo</span>
              <strong>Flávio & Ana Paula</strong>
              <p>
                {form.hero_background_type === "video"
                  ? "Vídeo aplicado no topo do site"
                  : "Imagem aplicada no topo do site"}
              </p>
            </div>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>Nenhuma mídia aplicada no hero</strong>
            <p>
              Selecione imagem ou vídeo para dar mais impacto visual à abertura
              do site.
            </p>
          </div>
        )}
      </AdminCard>

      </fieldset>

      <div className="admin-submit-bar">
        <div className="admin-submit-bar__feedback">
          {feedback ? (
            <p
              className={`form-feedback ${
                feedbackType === "error"
                  ? "form-feedback--error"
                  : "form-feedback--success"
              }`}
            >
              {feedback}
            </p>
          ) : (
            <span className="admin-submit-bar__hint">
              {hasChanges
                ? "HÃ¡ alteraÃ§Ãµes visuais nÃ£o salvas."
                : "Nenhuma alteraÃ§Ã£o pendente."}
            </span>
          )}
        </div>

        <div className="admin-submit-bar__actions">
          <AdminButton
            type="button"
            variant="secondary"
            disabled={loading || uploadingHero || !hasChanges}
            onClick={discardChanges}
          >
            Descartar
          </AdminButton>
          <AdminButton
            type="button"
            variant="secondary"
            disabled={loading || uploadingHero}
            onClick={restoreDefaults}
          >
            Restaurar padrÃ£o
          </AdminButton>
          <AdminButton
            type="submit"
            variant="primary"
            disabled={loading || uploadingHero || !hasChanges}
          >
            {loading
              ? "Salvando..."
              : uploadingHero
                ? "Enviando mídia..."
                : "Salvar layout"}
          </AdminButton>
        </div>
      </div>
    </form>
  );
}
