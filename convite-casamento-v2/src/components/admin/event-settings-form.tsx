"use client";

import { useState } from "react";
import { AdminButton } from "./ui/admin-button";
import { AdminCard, AdminCardHeader } from "./ui/admin-card";
import { AdminField } from "./ui/admin-field";
import { buildMapsUrl } from "../../lib/utils/maps";
import { buildChangedPatch } from "../../lib/utils/config-patch";
import { useUnsavedChanges } from "./use-unsaved-changes";
import {
  DEFAULT_RESERVED_DRESS_COLORS,
  MAX_RESERVED_DRESS_COLORS,
  normalizeReservedDressColors,
  type ReservedDressColor,
} from "../../lib/utils/reserved-colors";

type EventSettingsFormProps = {
  evento: {
    id: number;
    slug: string;
    nome_evento: string;
    nome_casal: string;
    data_evento: string | null;
    horario_evento: string | null;
    local_cerimonia: string | null;
    link_maps_cerimonia: string | null;
    local_recepcao: string | null;
    link_maps_recepcao: string | null;
  };
  configuracoes: {
    mensagem_confirmacao: string | null;
    data_limite_confirmacao: string | null;
    chave_pix: string | null;
    qr_pix_url: string | null;
    dress_code_titulo: string | null;
    dress_code_descricao: string | null;
    dress_code_homens: string | null;
    dress_code_mulheres: string | null;
    dress_code_cores: string | null;
    dress_code_cores_paleta: ReservedDressColor[] | null;
    dress_code_observacao: string | null;
    max_acompanhantes: number | null;
    updated_at?: string | null;
  } | null;
};

type FormState = {
  evento_id: number;
  slug: string;
  nome_evento: string;
  nome_casal: string;
  data_evento: string;
  horario_evento: string;
  local_cerimonia: string;
  link_maps_cerimonia: string;
  local_recepcao: string;
  link_maps_recepcao: string;
  mensagem_confirmacao: string;
  data_limite_confirmacao: string;
  chave_pix: string;
  qr_pix_url: string;
  dress_code_titulo: string;
  dress_code_descricao: string;
  dress_code_homens: string;
  dress_code_mulheres: string;
  dress_code_cores: string;
  dress_code_cores_paleta: ReservedDressColor[];
  dress_code_observacao: string;
  max_acompanhantes: string;
};

const editableFields = [
  "slug",
  "nome_evento",
  "nome_casal",
  "data_evento",
  "horario_evento",
  "local_cerimonia",
  "link_maps_cerimonia",
  "local_recepcao",
  "link_maps_recepcao",
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
] as const satisfies readonly (keyof FormState)[];

async function parseJsonResponse(response: Response) {
  const rawText = await response.text();

  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error(`Resposta inválida do servidor: ${rawText.slice(0, 180)}`);
  }
}

export function EventSettingsForm({
  evento,
  configuracoes,
}: EventSettingsFormProps) {
  const [form, setForm] = useState<FormState>({
    evento_id: evento.id,
    slug: evento.slug,
    nome_evento: evento.nome_evento || "",
    nome_casal: evento.nome_casal || "",
    data_evento: evento.data_evento || "",
    horario_evento: evento.horario_evento || "",
    local_cerimonia: evento.local_cerimonia || "",
    link_maps_cerimonia: evento.link_maps_cerimonia || "",
    local_recepcao: evento.local_recepcao || "",
    link_maps_recepcao: evento.link_maps_recepcao || "",
    mensagem_confirmacao: configuracoes?.mensagem_confirmacao || "",
    data_limite_confirmacao: configuracoes?.data_limite_confirmacao || "",
    chave_pix: configuracoes?.chave_pix || "",
    qr_pix_url: configuracoes?.qr_pix_url || "",
    dress_code_titulo: configuracoes?.dress_code_titulo || "",
    dress_code_descricao: configuracoes?.dress_code_descricao || "",
    dress_code_homens: configuracoes?.dress_code_homens || "",
    dress_code_mulheres: configuracoes?.dress_code_mulheres || "",
    dress_code_cores: configuracoes?.dress_code_cores || "",
    dress_code_cores_paleta: normalizeReservedDressColors(
      configuracoes?.dress_code_cores_paleta,
    ),
    dress_code_observacao: configuracoes?.dress_code_observacao || "",
    max_acompanhantes: String(configuracoes?.max_acompanhantes ?? 4),
  });

  const [savedForm, setSavedForm] = useState(form);
  const [configUpdatedAt, setConfigUpdatedAt] = useState(
    configuracoes?.updated_at || "",
  );
  const [loading, setLoading] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "">("");
  const changedFields = buildChangedPatch(savedForm, form, editableFields);
  const hasChanges = Object.keys(changedFields).length > 0;
  useUnsavedChanges(hasChanges);

  const ceremonyMapPreview = buildMapsUrl(
    form.link_maps_cerimonia,
    form.local_cerimonia,
  );
  const receptionMapPreview = buildMapsUrl(
    form.link_maps_recepcao,
    form.local_recepcao,
  );

  function handleChange(field: keyof FormState, value: string | number) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateReservedColor(
    index: number,
    field: keyof ReservedDressColor,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      dress_code_cores_paleta: prev.dress_code_cores_paleta.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]:
                field === "cor"
                  ? value.toUpperCase().slice(0, 7)
                  : value.slice(0, 40),
            }
          : item,
      ),
    }));
  }

  function addReservedColor() {
    setForm((prev) => {
      if (prev.dress_code_cores_paleta.length >= MAX_RESERVED_DRESS_COLORS) {
        return prev;
      }

      const fallback =
        DEFAULT_RESERVED_DRESS_COLORS[
          prev.dress_code_cores_paleta.length %
            DEFAULT_RESERVED_DRESS_COLORS.length
        ];

      return {
        ...prev,
        dress_code_cores_paleta: [
          ...prev.dress_code_cores_paleta,
          {
            nome: `Cor reservada ${prev.dress_code_cores_paleta.length + 1}`,
            cor: fallback.cor,
          },
        ],
      };
    });
  }

  function removeReservedColor(index: number) {
    setForm((prev) => ({
      ...prev,
      dress_code_cores_paleta: prev.dress_code_cores_paleta.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  }

  async function handleQrUpload(file: File) {
    try {
      setUploadingQr(true);
      setFeedback("");
      setFeedbackType("");

      const body = new FormData();
      body.append("file", file);
      body.append("eventoId", String(form.evento_id));
      body.append("folder", "pix");

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body,
      });

      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          result?.error || "Não foi possível enviar a imagem do QR PIX.",
        );
      }

      setForm((prev) => ({
        ...prev,
        qr_pix_url: result.data.publicUrl,
      }));

      setFeedback("Imagem do QR PIX enviada com sucesso.");
      setFeedbackType("success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível enviar a imagem.";
      setFeedback(message);
      setFeedbackType("error");
    } finally {
      setUploadingQr(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.nome_evento.trim()) {
      setFeedback("Informe o nome do evento.");
      setFeedbackType("error");
      return;
    }

    if (!form.nome_casal.trim()) {
      setFeedback("Informe o nome do casal.");
      setFeedbackType("error");
      return;
    }

    const maxAcompanhantes = Number(form.max_acompanhantes || 0);

    if (
      Number.isNaN(maxAcompanhantes) ||
      maxAcompanhantes < 0 ||
      maxAcompanhantes > 10
    ) {
      setFeedback("Defina um limite de acompanhantes entre 0 e 10.");
      setFeedbackType("error");
      return;
    }

    try {
      setLoading(true);
      setFeedback("");
      setFeedbackType("");

      const response = await fetch("/api/admin/evento-config", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          evento_id: form.evento_id,
          expected_updated_at: configUpdatedAt || undefined,
          ...changedFields,
          ...(Object.prototype.hasOwnProperty.call(
            changedFields,
            "max_acompanhantes",
          )
            ? { max_acompanhantes: maxAcompanhantes }
            : {}),
        }),
      });

      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível salvar.");
      }

      setFeedback("Configurações salvas com sucesso.");
      const saved = {
        ...form,
        ...(result.evento || {}),
        ...(result.configuracoes || {}),
        evento_id: form.evento_id,
        dress_code_cores_paleta: normalizeReservedDressColors(
          result.configuracoes?.dress_code_cores_paleta ??
            form.dress_code_cores_paleta,
          [],
        ),
        max_acompanhantes: String(
          result.configuracoes?.max_acompanhantes ?? form.max_acompanhantes,
        ),
      };

      setForm(saved);
      setSavedForm(saved);
      setConfigUpdatedAt(result.configuracoes?.updated_at || configUpdatedAt);
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

  return (
    <form className="admin-form-stack" onSubmit={handleSubmit}>
      <fieldset className="admin-form-fieldset" disabled={loading}>
      <AdminCard>
        <AdminCardHeader
          title="Informações principais"
          description="Defina os dados centrais do evento que aparecem no site e organizam o painel."
        />

        <div className="admin-form-grid">
          <AdminField label="Nome do evento" htmlFor="nome_evento">
            <input
              id="nome_evento"
              type="text"
              value={form.nome_evento}
              onChange={(e) => handleChange("nome_evento", e.target.value)}
              placeholder="Ex.: Casamento Flávio & Ana Paula"
            />
          </AdminField>

          <AdminField label="Nome do casal" htmlFor="nome_casal">
            <input
              id="nome_casal"
              type="text"
              value={form.nome_casal}
              onChange={(e) => handleChange("nome_casal", e.target.value)}
              placeholder="Ex.: Flávio & Ana Paula"
            />
          </AdminField>

          <AdminField
            label="Slug"
            htmlFor="slug"
            hint="Usado na URL pública do evento."
          >
            <input
              id="slug"
              type="text"
              value={form.slug}
              onChange={(e) => handleChange("slug", e.target.value)}
              placeholder="flavio-ana-paula"
            />
          </AdminField>

          <AdminField label="Horário do evento" htmlFor="horario_evento">
            <input
              id="horario_evento"
              type="time"
              value={form.horario_evento}
              onChange={(e) => handleChange("horario_evento", e.target.value)}
              placeholder="17h30"
            />
          </AdminField>

          <AdminField label="Data do evento" htmlFor="data_evento">
            <input
              id="data_evento"
              type="date"
              value={form.data_evento}
              onChange={(e) => handleChange("data_evento", e.target.value)}
            />
          </AdminField>

          <AdminField
            label="Data limite de confirmação"
            htmlFor="data_limite_confirmacao"
            hint="Define até quando o formulário de presença ficará liberado."
          >
            <input
              id="data_limite_confirmacao"
              type="date"
              value={form.data_limite_confirmacao}
              onChange={(e) =>
                handleChange("data_limite_confirmacao", e.target.value)
              }
            />
          </AdminField>
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="RSVP e participação"
          description="Defina o limite de acompanhantes e a mensagem exibida após a confirmação."
        />

        <div className="admin-form-grid">
          <AdminField
            label="Máximo de acompanhantes"
            htmlFor="max_acompanhantes"
            hint="Esse valor será aplicado no formulário público e na edição de convidados no painel."
          >
            <input
              id="max_acompanhantes"
              type="number"
              min={0}
              max={10}
              step={1}
              value={form.max_acompanhantes}
              onChange={(e) => handleChange("max_acompanhantes", e.target.value)}
            />
          </AdminField>

          <div />

          <div className="admin-form-grid-full">
            <AdminField
              label="Mensagem de confirmação"
              htmlFor="mensagem_confirmacao"
              hint="Mensagem mostrada para o convidado após enviar a presença."
            >
              <textarea
                id="mensagem_confirmacao"
                rows={4}
                value={form.mensagem_confirmacao}
                onChange={(e) =>
                  handleChange("mensagem_confirmacao", e.target.value)
                }
                placeholder="Ex.: Confirmação enviada com sucesso. Obrigado por fazer parte desse momento tão especial."
              />
            </AdminField>
          </div>
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Localização e links"
          description="Preencha os locais e os links de navegação para cerimônia e recepção."
        />

        <div className="admin-form-grid">
          <AdminField label="Local da cerimônia" htmlFor="local_cerimonia">
            <input
              id="local_cerimonia"
              type="text"
              value={form.local_cerimonia}
              onChange={(e) => handleChange("local_cerimonia", e.target.value)}
              placeholder="Ex.: Paróquia Santuário Nossa Senhora de Fátima"
            />
          </AdminField>

          <AdminField
            label="Link Maps da cerimônia"
            htmlFor="link_maps_cerimonia"
            hint="Cole o link compartilhado do Maps. Se deixar vazio, o sistema cria a rota usando o endereço informado."
          >
            <div className="admin-map-field">
              <input
                id="link_maps_cerimonia"
                type="text"
                value={form.link_maps_cerimonia}
                onChange={(e) =>
                  handleChange("link_maps_cerimonia", e.target.value)
                }
                placeholder="https://maps.app.goo.gl/... ou endereço"
              />

              {ceremonyMapPreview ? (
                <a
                  href={ceremonyMapPreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-map-preview-link"
                >
                  Testar localização da cerimônia
                </a>
              ) : null}
            </div>
          </AdminField>

          <AdminField label="Local da recepção" htmlFor="local_recepcao">
            <input
              id="local_recepcao"
              type="text"
              value={form.local_recepcao}
              onChange={(e) => handleChange("local_recepcao", e.target.value)}
              placeholder="Ex.: Rua Tambaqui, nº 60"
            />
          </AdminField>

          <AdminField
            label="Link Maps da recepção"
            htmlFor="link_maps_recepcao"
            hint="Cole o link compartilhado do Maps. Se deixar vazio, o sistema cria a rota usando o endereço informado."
          >
            <div className="admin-map-field">
              <input
                id="link_maps_recepcao"
                type="text"
                value={form.link_maps_recepcao}
                onChange={(e) =>
                  handleChange("link_maps_recepcao", e.target.value)
                }
                placeholder="https://maps.app.goo.gl/... ou endereço"
              />

              {receptionMapPreview ? (
                <a
                  href={receptionMapPreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-map-preview-link"
                >
                  Testar localização da recepção
                </a>
              ) : null}
            </div>
          </AdminField>
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Dress code atualizado"
          description="Configure as orientações de vestimenta que aparecerão no site público."
        />

        <div className="admin-form-grid">
          <AdminField label="Título do dress code" htmlFor="dress_code_titulo">
            <input
              id="dress_code_titulo"
              type="text"
              value={form.dress_code_titulo}
              onChange={(e) =>
                handleChange("dress_code_titulo", e.target.value)
              }
              placeholder="Ex.: Esporte fino"
            />
          </AdminField>

          <AdminField
            label="Descrição geral"
            htmlFor="dress_code_descricao"
            hint="Texto curto de abertura da seção."
          >
            <textarea
              id="dress_code_descricao"
              rows={4}
              value={form.dress_code_descricao}
              onChange={(e) =>
                handleChange("dress_code_descricao", e.target.value)
              }
              placeholder="Ex.: Para mantermos a harmonia visual da celebração, sugerimos trajes elegantes e confortáveis."
            />
          </AdminField>

          <AdminField
            label="Orientações para homens"
            htmlFor="dress_code_homens"
            hint="Você pode separar cada orientação por linha."
          >
            <textarea
              id="dress_code_homens"
              rows={6}
              value={form.dress_code_homens}
              onChange={(e) =>
                handleChange("dress_code_homens", e.target.value)
              }
              placeholder={`Ex.:
Camisa social
Calça de sarja ou alfaiataria
Sapato social ou mocassim
Blazer opcional
Evitar bermuda, jeans e boné`}
            />
          </AdminField>

          <AdminField
            label="Orientações para mulheres"
            htmlFor="dress_code_mulheres"
            hint="Você pode separar cada orientação por linha."
          >
            <textarea
              id="dress_code_mulheres"
              rows={6}
              value={form.dress_code_mulheres}
              onChange={(e) =>
                handleChange("dress_code_mulheres", e.target.value)
              }
              placeholder={`Ex.:
Vestido longo ou midi
Saia longa com blusa elegante
Sapatos com salto ou rasteira refinada
Evitar vestidos curtos, roupas muito justas e transparências excessivas`}
            />
          </AdminField>

          <div className="admin-form-grid-full">
            <AdminField
              label="Texto das cores reservadas"
              htmlFor="dress_code_cores"
              hint="Mensagem exibida ao lado da paleta visual."
            >
              <textarea
                id="dress_code_cores"
                rows={4}
                value={form.dress_code_cores}
                onChange={(e) =>
                  handleChange("dress_code_cores", e.target.value)
                }
                placeholder="Ex.: Pedimos que evitem tons muito próximos às cores abaixo, pois fazem parte da identidade visual do casamento."
              />
            </AdminField>
          </div>

          <div className="admin-form-grid-full">
            <AdminField
              label="Bolinhas das cores reservadas"
              hint={`Adicione, remova e escolha até ${MAX_RESERVED_DRESS_COLORS} cores. A ordem abaixo será mantida no convite.`}
            >
              <div className="admin-reserved-colors-editor">
                <div className="admin-reserved-colors-editor__list">
                  {form.dress_code_cores_paleta.map((item, index) => (
                    <div
                      className="admin-reserved-color-row"
                      key={index}
                    >
                      <div
                        className="admin-reserved-color-row__preview"
                        style={{ backgroundColor: item.cor }}
                        aria-hidden="true"
                      />

                      <input
                        type="color"
                        value={item.cor}
                        aria-label={`Selecionar cor reservada ${index + 1}`}
                        onChange={(event) =>
                          updateReservedColor(index, "cor", event.target.value)
                        }
                      />

                      <input
                        type="text"
                        value={item.cor}
                        aria-label={`Código hexadecimal da cor reservada ${index + 1}`}
                        readOnly
                      />

                      <input
                        type="text"
                        value={item.nome}
                        maxLength={40}
                        aria-label={`Nome da cor reservada ${index + 1}`}
                        placeholder={`Cor reservada ${index + 1}`}
                        onChange={(event) =>
                          updateReservedColor(index, "nome", event.target.value)
                        }
                      />

                      <AdminButton
                        type="button"
                        variant="ghost"
                        className="admin-reserved-color-row__remove"
                        onClick={() => removeReservedColor(index)}
                      >
                        Remover
                      </AdminButton>
                    </div>
                  ))}
                </div>

                <div className="admin-reserved-colors-editor__footer">
                  <span>
                    {form.dress_code_cores_paleta.length} de{" "}
                    {MAX_RESERVED_DRESS_COLORS} cores
                  </span>

                  <AdminButton
                    type="button"
                    variant="secondary"
                    onClick={addReservedColor}
                    disabled={
                      form.dress_code_cores_paleta.length >=
                      MAX_RESERVED_DRESS_COLORS
                    }
                  >
                    Adicionar cor
                  </AdminButton>
                </div>

                <div
                  className="admin-reserved-colors-editor__preview"
                  aria-label="Prévia das cores reservadas"
                >
                  {form.dress_code_cores_paleta.length ? (
                    form.dress_code_cores_paleta.map((item, index) => (
                      <span
                        className="admin-reserved-colors-editor__chip"
                        key={`${item.nome}-${index}`}
                      >
                        <span
                          style={{ backgroundColor: item.cor }}
                          aria-hidden="true"
                        />
                        {item.nome || `Cor ${index + 1}`}
                      </span>
                    ))
                  ) : (
                    <small>Nenhuma bolinha será exibida no convite.</small>
                  )}
                </div>
              </div>
            </AdminField>
          </div>

          <div className="admin-form-grid-full">
            <AdminField
              label="Observação final"
              htmlFor="dress_code_observacao"
              hint="Mensagem opcional exibida no final da seção."
            >
              <textarea
                id="dress_code_observacao"
                rows={3}
                value={form.dress_code_observacao}
                onChange={(e) =>
                  handleChange("dress_code_observacao", e.target.value)
                }
                placeholder="Ex.: O mais importante é que você se sinta bem para celebrar esse momento conosco."
              />
            </AdminField>
          </div>
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="PIX"
          description="Configure a chave PIX e o QR code exibidos na página pública."
        />

        <div className="admin-form-grid">
          <AdminField
            label="Chave PIX"
            htmlFor="chave_pix"
            hint="Pode ser e-mail, telefone, CPF ou chave aleatória."
          >
            <input
              id="chave_pix"
              type="text"
              value={form.chave_pix}
              onChange={(e) => handleChange("chave_pix", e.target.value)}
              placeholder="Digite a chave PIX"
            />
          </AdminField>

          <div className="admin-form-grid-full">
            <AdminField
              label="Imagem do QR PIX"
              htmlFor="qr_pix_upload"
              hint="Selecione a imagem do QR code. O upload preenche a URL automaticamente."
            >
              <input
                id="qr_pix_upload"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleQrUpload(file);
                  }
                }}
              />
            </AdminField>
          </div>

          <div className="admin-form-grid-full">
            <AdminField
              label="URL final do QR PIX"
              htmlFor="qr_pix_url"
              hint="Campo preenchido automaticamente após o upload, mas pode ser ajustado manualmente se necessário."
            >
              <input
                id="qr_pix_url"
                type="url"
                value={form.qr_pix_url}
                onChange={(e) => handleChange("qr_pix_url", e.target.value)}
                placeholder="Será preenchido automaticamente pelo upload"
              />
            </AdminField>
          </div>

          {form.qr_pix_url ? (
            <div className="admin-form-grid-full">
              <AdminField label="Pré-visualização do QR PIX">
                <div className="admin-upload-preview">
                  <img
                    src={form.qr_pix_url}
                    alt="Prévia do QR PIX"
                    className="admin-upload-preview-image admin-upload-preview-image--small"
                  />
                </div>
              </AdminField>
            </div>
          ) : null}
        </div>
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
                ? "Há alterações prontas para salvar."
                : "Nenhuma alteração pendente."}
            </span>
          )}
        </div>

        <div className="admin-submit-bar__actions">
          <AdminButton
            type="submit"
            variant="primary"
            disabled={loading || uploadingQr || !hasChanges}
          >
            {loading ? "Salvando..." : "Salvar configurações"}
          </AdminButton>
        </div>
      </div>
    </form>
  );
}
