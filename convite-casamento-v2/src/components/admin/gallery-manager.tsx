"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AdminSectionHeader } from "./admin-section-header";
import { AdminBadge } from "./ui/admin-badge";
import { AdminButton } from "./ui/admin-button";
import { AdminCard, AdminCardHeader } from "./ui/admin-card";
import { AdminField } from "./ui/admin-field";
import { useAdminModal } from "./use-admin-modal";

type GaleriaItem = {
  id: number;
  evento_id: number;
  imagem_url: string;
  ordem: number;
  destaque: boolean;
  created_at?: string;
};

type GalleryManagerProps = {
  eventoId: number;
  imagens: GaleriaItem[];
};

type GalleryFormState = {
  id: number | null;
  imagem_url: string;
  ordem: string;
  destaque: boolean;
};

const initialForm: GalleryFormState = {
  id: null,
  imagem_url: "",
  ordem: "0",
  destaque: false,
};

async function parseJsonResponse(response: Response) {
  const rawText = await response.text();

  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error(`Resposta inválida do servidor: ${rawText.slice(0, 180)}`);
  }
}

export function GalleryManager({ eventoId, imagens }: GalleryManagerProps) {
  const [galleryList, setGalleryList] = useState<GaleriaItem[]>(imagens);
  const [form, setForm] = useState<GalleryFormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "">("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const modalTriggerRef = useRef<HTMLButtonElement | null>(null);

  const filteredGallery = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const ordered = [...galleryList].sort((a, b) => {
      if (Number(b.destaque) !== Number(a.destaque)) {
        return Number(b.destaque) - Number(a.destaque);
      }

      return Number(a.ordem) - Number(b.ordem);
    });

    if (!normalizedSearch) return ordered;

    return ordered.filter((item) => {
      const haystack = [
        item.imagem_url,
        `ordem ${item.ordem}`,
        item.destaque ? "destaque" : "padrao",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [galleryList, search]);

  const stats = useMemo(() => {
    const totalImagens = galleryList.length;
    const destaques = galleryList.filter((item) => item.destaque).length;
    const padrao = galleryList.filter((item) => !item.destaque).length;
    const maiorOrdem = galleryList.length
      ? Math.max(...galleryList.map((item) => Number(item.ordem || 0)))
      : 0;

    return {
      totalImagens,
      destaques,
      padrao,
      maiorOrdem,
    };
  }, [galleryList]);

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

  useAdminModal(isModalOpen, closeModal, loading || uploadingImage, modalTriggerRef);

  function openCreateModal() {
    resetForm();
    setIsModalOpen(true);
  }

  function openEditModal(item: GaleriaItem) {
    setForm({
      id: Number(item.id),
      imagem_url: item.imagem_url || "",
      ordem: String(item.ordem ?? 0),
      destaque: !!item.destaque,
    });

    setFeedback("");
    setFeedbackType("");
    setIsModalOpen(true);
  }

  function handleChange<K extends keyof GalleryFormState>(
    field: K,
    value: GalleryFormState[K],
  ) {
    setForm((prev) => ({
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
      body.append("folder", "galeria");

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

  async function handleDelete(item: GaleriaItem) {
    const confirmed = window.confirm("Deseja excluir esta imagem da galeria?");
    if (!confirmed) return;

    try {
      setLoading(true);
      setFeedback("");
      setFeedbackType("");

      const response = await fetch(
        `/api/admin/galeria?id=${item.id}&evento_id=${eventoId}`,
        {
          method: "DELETE",
        },
      );

      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível excluir a imagem.");
      }

      setGalleryList((prev) =>
        prev.filter((galleryItem) => Number(galleryItem.id) !== Number(item.id)),
      );

      setFeedback("Imagem excluída com sucesso.");
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
      setFeedback("Informe a imagem da galeria.");
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

      const response = await fetch("/api/admin/galeria", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: form.id || undefined,
          evento_id: eventoId,
          imagem_url: form.imagem_url.trim(),
          ordem,
          destaque: form.destaque,
        }),
      });

      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível salvar a imagem.");
      }

      const savedItem = result.data as GaleriaItem;

      setGalleryList((prev) => {
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
          ? "Imagem atualizada com sucesso."
          : "Imagem cadastrada com sucesso.",
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
          badge="Layout"
          title="Galeria e visual"
          description="Organize as imagens que aparecem no site público e defina a imagem de destaque da galeria."
          actions={
            <AdminButton
              type="button"
              variant="primary"
              onClick={(event) => {
                modalTriggerRef.current = event.currentTarget;
                event.currentTarget.focus();
                openCreateModal();
              }}
              disabled={loading}
            >
              Adicionar imagem
            </AdminButton>
          }
        />

        <div className="admin-overview-metrics">
          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Imagens</span>
            <strong className="admin-metric-value">{stats.totalImagens}</strong>
            <p className="admin-metric-text">Total de imagens cadastradas.</p>
          </AdminCard>

          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Destaque</span>
            <strong className="admin-metric-value">{stats.destaques}</strong>
            <p className="admin-metric-text">Imagem marcada como principal.</p>
          </AdminCard>

          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Padrão</span>
            <strong className="admin-metric-value">{stats.padrao}</strong>
            <p className="admin-metric-text">Imagens sem status de destaque.</p>
          </AdminCard>

          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Maior ordem</span>
            <strong className="admin-metric-value">{stats.maiorOrdem}</strong>
            <p className="admin-metric-text">Última posição de organização atual.</p>
          </AdminCard>
        </div>
      </section>

      <AdminCard>
        <AdminCardHeader
          title="Galeria cadastrada"
          description="Busque por ordem, status ou URL para localizar imagens mais rapidamente."
          rightSlot={
            <div className="admin-finance-search">
              <input
                type="search"
                placeholder="Buscar imagem..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          }
        />

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
        ) : null}

        {filteredGallery.length === 0 ? (
          <div className="admin-empty-state">
            <strong>Nenhuma imagem encontrada</strong>
            <p>
              Ajuste a busca ou cadastre uma nova imagem para compor a galeria do evento.
            </p>
          </div>
        ) : (
          <div className="admin-layout-grid-refined">
            {filteredGallery.map((item) => (
              <AdminCard
                key={item.id}
                className={`admin-layout-card-refined ${
                  item.destaque ? "admin-layout-card-refined--featured" : ""
                }`}
              >
                <div className="admin-layout-card-refined__image-wrap">
                  <img
                    src={item.imagem_url}
                    alt={`Imagem ${item.ordem}`}
                    className="admin-layout-card-refined__image"
                  />
                </div>

                <div className="admin-layout-card-refined__content">
                  <div className="admin-layout-card-refined__badges">
                    {item.destaque ? (
                      <AdminBadge variant="success">Imagem destaque</AdminBadge>
                    ) : (
                      <AdminBadge variant="neutral">Imagem padrão</AdminBadge>
                    )}

                    <AdminBadge variant="default">Ordem {item.ordem}</AdminBadge>
                  </div>

                  <p className="admin-layout-card-refined__url">
                    {item.imagem_url}
                  </p>

                  <div className="admin-layout-card-refined__actions">
                    <AdminButton
                      type="button"
                      variant="secondary"
                      onClick={(event) => {
                        modalTriggerRef.current = event.currentTarget;
                        event.currentTarget.focus();
                        openEditModal(item);
                      }}
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
          <div className="admin-modal-card admin-modal-card--wide" role="dialog" aria-modal="true" aria-labelledby="gallery-modal-title">
            <div className="admin-modal-header">
              <div className="admin-modal-title-wrap">
                <AdminBadge>{form.id ? "Editar imagem" : "Nova imagem"}</AdminBadge>
                <h3 id="gallery-modal-title" className="admin-modal-title">
                  {form.id ? "Atualizar imagem" : "Cadastrar imagem"}
                </h3>
                <p className="admin-modal-subtitle">
                  Faça upload da imagem, defina a ordem e escolha se ela será o destaque da galeria.
                </p>
              </div>

              <button
                type="button"
                className="admin-modal-close"
                onClick={closeModal}
                disabled={loading || uploadingImage}
                aria-label="Fechar"
                autoFocus
              >
                ×
              </button>
            </div>

            <form className="admin-form-stack" onSubmit={handleSubmit}>
              <AdminCard>
                <AdminCardHeader
                  title="Imagem da galeria"
                  description="Envie a imagem e revise o resultado antes de salvar."
                />

                <div className="admin-form-grid">
                  <div className="admin-form-grid-full">
                    <AdminField
                      label="Arquivo da imagem"
                      htmlFor="galeria_imagem_upload"
                      hint="O upload preenche a URL final automaticamente."
                    >
                      <input
                        id="galeria_imagem_upload"
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
                      htmlFor="galeria_imagem_url"
                    >
                      <input
                        id="galeria_imagem_url"
                        type="url"
                        value={form.imagem_url}
                        onChange={(e) => handleChange("imagem_url", e.target.value)}
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
                            alt="Prévia da galeria"
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
                  title="Organização visual"
                  description="Controle a ordem de exibição e destaque a imagem principal."
                />

                <div className="admin-form-grid">
                  <AdminField
                    label="Ordem"
                    htmlFor="galeria_ordem"
                    hint="Números menores aparecem antes na galeria."
                  >
                    <input
                      id="galeria_ordem"
                      type="number"
                      min={0}
                      value={form.ordem}
                      onChange={(e) => handleChange("ordem", e.target.value)}
                    />
                  </AdminField>

                  <div className="admin-form-grid-full">
                    <div className="admin-switch-card">
                      <div className="admin-switch-card__content">
                        <strong>Marcar como imagem destaque</strong>
                        <p>
                          Quando ativada, esta imagem assume a posição principal da galeria.
                        </p>
                      </div>

                      <label className="admin-switch">
                        <input
                          id="galeria_destaque"
                          type="checkbox"
                          checked={form.destaque}
                          onChange={(e) => handleChange("destaque", e.target.checked)}
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
                      Revise a imagem, a ordem e o destaque antes de salvar.
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
                        : "Cadastrar imagem"}
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
