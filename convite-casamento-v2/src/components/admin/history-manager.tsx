"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminSectionHeader } from "./admin-section-header";
import { AdminBadge } from "./ui/admin-badge";
import { AdminButton } from "./ui/admin-button";
import { AdminCard, AdminCardHeader } from "./ui/admin-card";
import { AdminField } from "./ui/admin-field";

type HistoriaMomento = {
  id: number;
  evento_id: number;
  imagem_url: string;
  titulo: string | null;
  descricao: string | null;
  ordem: number | null;
  destaque: boolean | null;
  created_at?: string | null;
};

type HistoriaConfig = {
  historia_ativa: boolean | null;
  historia_titulo: string | null;
  historia_descricao: string | null;
  historia_modelo_grid: "editorial" | "mosaico" | "timeline" | null;
} | null;

type HistoryManagerProps = {
  eventoId: number;
  configuracoes: HistoriaConfig;
  momentos: HistoriaMomento[];
};

type HistoryFormState = {
  id: number | null;
  imagem_url: string;
  titulo: string;
  descricao: string;
  ordem: string;
  destaque: boolean;
};

type HistoryConfigState = {
  historia_ativa: boolean;
  historia_titulo: string;
  historia_descricao: string;
  historia_modelo_grid: "editorial" | "mosaico" | "timeline";
};

const initialForm: HistoryFormState = {
  id: null,
  imagem_url: "",
  titulo: "",
  descricao: "",
  ordem: "0",
  destaque: false,
};

const gridOptions = [
  {
    value: "editorial",
    title: "Editorial",
    description: "Foto destaque com composição elegante e texto de apoio.",
  },
  {
    value: "mosaico",
    title: "Mosaico",
    description: "Fotos em blocos visuais com leitura mais dinâmica.",
  },
  {
    value: "timeline",
    title: "Linha do tempo",
    description: "Momentos organizados como trajetória da história.",
  },
] as const;

async function parseJsonResponse(response: Response) {
  const rawText = await response.text();

  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error(`Resposta inválida do servidor: ${rawText.slice(0, 180)}`);
  }
}

export function HistoryManager({
  eventoId,
  configuracoes,
  momentos,
}: HistoryManagerProps) {
  const [historyList, setHistoryList] = useState<HistoriaMomento[]>(momentos);
  const [form, setForm] = useState<HistoryFormState>(initialForm);
  const [configForm, setConfigForm] = useState<HistoryConfigState>({
    historia_ativa: configuracoes?.historia_ativa ?? true,
    historia_titulo: configuracoes?.historia_titulo || "Nossa história",
    historia_descricao:
      configuracoes?.historia_descricao ||
      "Alguns momentos especiais que fazem parte da nossa caminhada até este grande dia.",
    historia_modelo_grid: configuracoes?.historia_modelo_grid || "editorial",
  });

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "">("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredMoments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const ordered = [...historyList].sort((a, b) => {
      if (Number(b.destaque) !== Number(a.destaque)) {
        return Number(b.destaque) - Number(a.destaque);
      }

      return Number(a.ordem || 0) - Number(b.ordem || 0);
    });

    if (!normalizedSearch) return ordered;

    return ordered.filter((item) => {
      const haystack = [
        item.titulo,
        item.descricao,
        item.imagem_url,
        `ordem ${item.ordem}`,
        item.destaque ? "destaque" : "padrao",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [historyList, search]);

  const stats = useMemo(() => {
    const totalMomentos = historyList.length;
    const destaques = historyList.filter((item) => item.destaque).length;
    const comTexto = historyList.filter(
      (item) => item.titulo || item.descricao,
    ).length;
    const maiorOrdem = historyList.length
      ? Math.max(...historyList.map((item) => Number(item.ordem || 0)))
      : 0;

    return {
      totalMomentos,
      destaques,
      comTexto,
      maiorOrdem,
    };
  }, [historyList]);

  const resetForm = useCallback(() => {
    setForm(initialForm);
    setFeedback("");
    setFeedbackType("");
  }, []);

  const closeModal = useCallback(() => {
    if (loading || uploadingImage) return;
    setIsModalOpen(false);
    resetForm();
  }, [loading, uploadingImage, resetForm]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading && !uploadingImage) {
        closeModal();
      }
    }

    if (isModalOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isModalOpen, loading, uploadingImage, closeModal]);

  function openCreateModal() {
    resetForm();
    setIsModalOpen(true);
  }

  function openEditModal(item: HistoriaMomento) {
    setForm({
      id: Number(item.id),
      imagem_url: item.imagem_url || "",
      titulo: item.titulo || "",
      descricao: item.descricao || "",
      ordem: String(item.ordem ?? 0),
      destaque: !!item.destaque,
    });

    setFeedback("");
    setFeedbackType("");
    setIsModalOpen(true);
  }

  function handleChange<K extends keyof HistoryFormState>(
    field: K,
    value: HistoryFormState[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleConfigChange<K extends keyof HistoryConfigState>(
    field: K,
    value: HistoryConfigState[K],
  ) {
    setConfigForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleImageUpload(file: File) {
    try {
      setUploadingImage(true);
      setFeedback("");
      setFeedbackType("");

      const body = new FormData();
      body.append("file", file);
      body.append("eventoId", String(eventoId));
      body.append("folder", "historia");
      body.append("mediaType", "image");

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body,
      });

      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível enviar a imagem.");
      }

      setForm((prev) => ({
        ...prev,
        imagem_url: result.data.publicUrl,
      }));

      setFeedback("Imagem enviada com sucesso.");
      setFeedbackType("success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível enviar a imagem.";
      setFeedback(message);
      setFeedbackType("error");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSaveConfig() {
    try {
      setSavingConfig(true);
      setFeedback("");
      setFeedbackType("");

      const response = await fetch("/api/admin/historia-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          evento_id: eventoId,
          historia_ativa: configForm.historia_ativa,
          historia_titulo: configForm.historia_titulo,
          historia_descricao: configForm.historia_descricao,
          historia_modelo_grid: configForm.historia_modelo_grid,
        }),
      });

      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível salvar a seção.");
      }

      setFeedback("Configurações da história salvas com sucesso.");
      setFeedbackType("success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível salvar.";
      setFeedback(message);
      setFeedbackType("error");
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleDelete(item: HistoriaMomento) {
    const confirmed = window.confirm("Deseja excluir este momento da história?");
    if (!confirmed) return;

    try {
      setLoading(true);
      setFeedback("");
      setFeedbackType("");

      const response = await fetch(
        `/api/admin/historia?id=${item.id}&evento_id=${eventoId}`,
        {
          method: "DELETE",
        },
      );

      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível excluir o momento.");
      }

      setHistoryList((prev) =>
        prev.filter((historyItem) => Number(historyItem.id) !== Number(item.id)),
      );

      setFeedback("Momento excluído com sucesso.");
      setFeedbackType("success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível excluir.";
      setFeedback(message);
      setFeedbackType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.imagem_url.trim()) {
      setFeedback("Informe a imagem do momento.");
      setFeedbackType("error");
      return;
    }

    const ordem = Number(form.ordem || 0);

    if (Number.isNaN(ordem) || ordem < 0) {
      setFeedback("Informe uma ordem válida.");
      setFeedbackType("error");
      return;
    }

    try {
      setLoading(true);
      setFeedback("");
      setFeedbackType("");

      const response = await fetch("/api/admin/historia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: form.id || undefined,
          evento_id: eventoId,
          imagem_url: form.imagem_url.trim(),
          titulo: form.titulo,
          descricao: form.descricao,
          ordem,
          destaque: form.destaque,
        }),
      });

      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível salvar o momento.");
      }

      const savedItem = result.data as HistoriaMomento;

      setHistoryList((prev) => {
        const normalized = form.destaque
          ? prev.map((item) => ({ ...item, destaque: false }))
          : [...prev];

        const exists = normalized.some(
          (item) => Number(item.id) === Number(savedItem.id),
        );

        if (exists) {
          return normalized.map((item) =>
            Number(item.id) === Number(savedItem.id) ? savedItem : item,
          );
        }

        return [...normalized, savedItem];
      });

      setFeedback(
        form.id
          ? "Momento atualizado com sucesso."
          : "Momento cadastrado com sucesso.",
      );
      setFeedbackType("success");
      setIsModalOpen(false);
      resetForm();
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
    <div className="admin-page-stack">
      <section className="event-section">
        <AdminSectionHeader
          badge="História"
          title="Nossa história"
          description="Configure os momentos que contam a trajetória do casal no site público."
          actions={
            <AdminButton
              type="button"
              variant="primary"
              onClick={openCreateModal}
              disabled={loading}
            >
              Adicionar momento
            </AdminButton>
          }
        />

        <div className="admin-overview-metrics">
          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Momentos</span>
            <strong className="admin-metric-value">{stats.totalMomentos}</strong>
            <p className="admin-metric-text">Fotos cadastradas para a história.</p>
          </AdminCard>

          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Destaque</span>
            <strong className="admin-metric-value">{stats.destaques}</strong>
            <p className="admin-metric-text">Momento principal da seção.</p>
          </AdminCard>

          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Com texto</span>
            <strong className="admin-metric-value">{stats.comTexto}</strong>
            <p className="admin-metric-text">Momentos com título ou descrição.</p>
          </AdminCard>

          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Maior ordem</span>
            <strong className="admin-metric-value">{stats.maiorOrdem}</strong>
            <p className="admin-metric-text">Última posição cadastrada.</p>
          </AdminCard>
        </div>
      </section>

      <AdminCard>
        <AdminCardHeader
          title="Configuração da seção"
          description="Defina como a seção Nossa História será exibida na página pública."
        />

        <div className="admin-form-grid">
          <div className="admin-form-grid-full">
            <div className="admin-switch-card">
              <div className="admin-switch-card__content">
                <strong>Exibir seção Nossa História</strong>
                <p>
                  Quando ativada, a seção aparecerá no site público com os momentos cadastrados.
                </p>
              </div>

              <label className="admin-switch">
                <input
                  type="checkbox"
                  checked={configForm.historia_ativa}
                  onChange={(e) =>
                    handleConfigChange("historia_ativa", e.target.checked)
                  }
                />
                <span className="admin-switch__slider" />
              </label>
            </div>
          </div>

          <AdminField label="Título da seção" htmlFor="historia_titulo">
            <input
              id="historia_titulo"
              type="text"
              value={configForm.historia_titulo}
              onChange={(e) =>
                handleConfigChange("historia_titulo", e.target.value)
              }
              placeholder="Nossa história"
            />
          </AdminField>

          <AdminField label="Modelo de grid" htmlFor="historia_modelo_grid">
            <select
              id="historia_modelo_grid"
              value={configForm.historia_modelo_grid}
              onChange={(e) =>
                handleConfigChange(
                  "historia_modelo_grid",
                  e.target.value as HistoryConfigState["historia_modelo_grid"],
                )
              }
            >
              {gridOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.title}
                </option>
              ))}
            </select>
          </AdminField>

          <div className="admin-form-grid-full">
            <AdminField
              label="Texto introdutório"
              htmlFor="historia_descricao"
            >
              <textarea
                id="historia_descricao"
                rows={4}
                value={configForm.historia_descricao}
                onChange={(e) =>
                  handleConfigChange("historia_descricao", e.target.value)
                }
                placeholder="Conte um pouco sobre essa caminhada..."
              />
            </AdminField>
          </div>
        </div>

        <div className="admin-history-grid-options">
          {gridOptions.map((item) => {
            const active = configForm.historia_modelo_grid === item.value;

            return (
              <button
                key={item.value}
                type="button"
                className={`admin-history-grid-option ${
                  active ? "admin-history-grid-option--active" : ""
                }`}
                onClick={() =>
                  handleConfigChange("historia_modelo_grid", item.value)
                }
              >
                <strong>{item.title}</strong>
                <span>{item.description}</span>
                {active ? <AdminBadge variant="success">Ativo</AdminBadge> : null}
              </button>
            );
          })}
        </div>

        <div className="admin-submit-bar admin-submit-bar--inline">
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
                Salve as configurações antes de revisar o site público.
              </span>
            )}
          </div>

          <div className="admin-submit-bar__actions">
            <AdminButton
              type="button"
              variant="primary"
              onClick={handleSaveConfig}
              disabled={savingConfig}
            >
              {savingConfig ? "Salvando..." : "Salvar seção"}
            </AdminButton>
          </div>
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Momentos cadastrados"
          description="Gerencie fotos, textos e ordem dos momentos da história."
          rightSlot={
            <div className="admin-finance-search">
              <input
                type="text"
                placeholder="Buscar momento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          }
        />

        {filteredMoments.length === 0 ? (
          <div className="admin-empty-state">
            <strong>Nenhum momento encontrado</strong>
            <p>
              Cadastre fotos com textos para transformar a seção em uma narrativa mais acolhedora.
            </p>
          </div>
        ) : (
          <div className="admin-layout-grid-refined">
            {filteredMoments.map((item) => (
              <AdminCard
                key={item.id}
                className={`admin-layout-card-refined ${
                  item.destaque ? "admin-layout-card-refined--featured" : ""
                }`}
              >
                <div className="admin-layout-card-refined__image-wrap">
                  <img
                    src={item.imagem_url}
                    alt={item.titulo || `Momento ${item.ordem}`}
                    className="admin-layout-card-refined__image"
                  />
                </div>

                <div className="admin-layout-card-refined__content">
                  <div className="admin-layout-card-refined__badges">
                    {item.destaque ? (
                      <AdminBadge variant="success">Momento destaque</AdminBadge>
                    ) : (
                      <AdminBadge variant="neutral">Momento padrão</AdminBadge>
                    )}

                    <AdminBadge variant="default">
                      Ordem {item.ordem ?? 0}
                    </AdminBadge>
                  </div>

                  <h3 className="admin-layout-card-refined__title">
                    {item.titulo || "Momento sem título"}
                  </h3>

                  <p className="admin-layout-card-refined__text">
                    {item.descricao || "Sem texto de apoio cadastrado."}
                  </p>

                  <div className="admin-layout-card-refined__actions">
                    <AdminButton
                      type="button"
                      variant="secondary"
                      onClick={() => openEditModal(item)}
                      disabled={loading}
                      className="admin-layout-card-refined__button"
                    >
                      Editar
                    </AdminButton>

                    <AdminButton
                      type="button"
                      variant="danger"
                      onClick={() => handleDelete(item)}
                      disabled={loading}
                      className="admin-layout-card-refined__button"
                    >
                      Excluir
                    </AdminButton>
                  </div>
                </div>
              </AdminCard>
            ))}
          </div>
        )}
      </AdminCard>

      {isModalOpen ? (
        <div
          className="admin-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="admin-modal-card admin-modal-card--wide">
            <div className="admin-modal-header">
              <div className="admin-modal-title-wrap">
                <AdminBadge>{form.id ? "Editar momento" : "Novo momento"}</AdminBadge>
                <h3 className="admin-modal-title">
                  {form.id ? "Atualizar momento" : "Cadastrar momento"}
                </h3>
                <p className="admin-modal-subtitle">
                  Envie a foto, adicione um texto e organize a ordem de exibição.
                </p>
              </div>

              <button
                type="button"
                className="admin-modal-close"
                onClick={closeModal}
                disabled={loading || uploadingImage}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <form className="admin-form-stack" onSubmit={handleSubmit}>
              <AdminCard>
                <AdminCardHeader
                  title="Foto do momento"
                  description="Envie uma imagem que represente essa parte da história."
                />

                <div className="admin-form-grid">
                  <div className="admin-form-grid-full">
                    <AdminField
                      label="Arquivo da imagem"
                      htmlFor="historia_imagem_upload"
                      hint="O upload preenche a URL automaticamente."
                    >
                      <input
                        id="historia_imagem_upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            void handleImageUpload(file);
                          }
                        }}
                      />
                    </AdminField>
                  </div>

                  <div className="admin-form-grid-full">
                    <AdminField
                      label="URL final da imagem"
                      htmlFor="historia_imagem_url"
                    >
                      <input
                        id="historia_imagem_url"
                        type="text"
                        value={form.imagem_url}
                        onChange={(e) =>
                          handleChange("imagem_url", e.target.value)
                        }
                        placeholder="Será preenchido automaticamente pelo upload"
                      />
                    </AdminField>
                  </div>

                  {form.imagem_url ? (
                    <div className="admin-form-grid-full">
                      <AdminField label="Pré-visualização">
                        <div className="admin-upload-preview admin-upload-preview--large">
                          <img
                            src={form.imagem_url}
                            alt="Prévia do momento"
                            className="admin-upload-preview-image"
                          />
                        </div>
                      </AdminField>
                    </div>
                  ) : null}
                </div>
              </AdminCard>

              <AdminCard>
                <AdminCardHeader
                  title="Texto e organização"
                  description="Adicione uma legenda afetiva e defina a posição do momento."
                />

                <div className="admin-form-grid">
                  <AdminField label="Título do momento" htmlFor="historia_titulo_item">
                    <input
                      id="historia_titulo_item"
                      type="text"
                      value={form.titulo}
                      onChange={(e) => handleChange("titulo", e.target.value)}
                      placeholder="Ex.: O começo de tudo"
                    />
                  </AdminField>

                  <AdminField
                    label="Ordem"
                    htmlFor="historia_ordem"
                    hint="Números menores aparecem antes."
                  >
                    <input
                      id="historia_ordem"
                      type="number"
                      min={0}
                      value={form.ordem}
                      onChange={(e) => handleChange("ordem", e.target.value)}
                    />
                  </AdminField>

                  <div className="admin-form-grid-full">
                    <AdminField
                      label="Texto do momento"
                      htmlFor="historia_descricao_item"
                    >
                      <textarea
                        id="historia_descricao_item"
                        rows={5}
                        value={form.descricao}
                        onChange={(e) =>
                          handleChange("descricao", e.target.value)
                        }
                        placeholder="Conte em poucas linhas por que esse momento é especial."
                      />
                    </AdminField>
                  </div>

                  <div className="admin-form-grid-full">
                    <div className="admin-switch-card">
                      <div className="admin-switch-card__content">
                        <strong>Marcar como momento destaque</strong>
                        <p>
                          O momento destaque poderá ganhar mais espaço dependendo do modelo escolhido.
                        </p>
                      </div>

                      <label className="admin-switch">
                        <input
                          type="checkbox"
                          checked={form.destaque}
                          onChange={(e) =>
                            handleChange("destaque", e.target.checked)
                          }
                        />
                        <span className="admin-switch__slider" />
                      </label>
                    </div>
                  </div>
                </div>
              </AdminCard>

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
                      Revise a imagem, texto e ordem antes de salvar.
                    </span>
                  )}
                </div>

                <div className="admin-submit-bar__actions">
                  <AdminButton
                    type="button"
                    variant="secondary"
                    onClick={closeModal}
                    disabled={loading || uploadingImage}
                  >
                    Cancelar
                  </AdminButton>

                  <AdminButton
                    type="submit"
                    variant="primary"
                    disabled={loading || uploadingImage}
                  >
                    {loading
                      ? "Salvando..."
                      : form.id
                        ? "Salvar alterações"
                        : "Cadastrar momento"}
                  </AdminButton>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}