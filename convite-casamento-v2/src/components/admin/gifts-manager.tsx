"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AdminSectionHeader } from "./admin-section-header";
import { AdminBadge } from "./ui/admin-badge";
import { AdminButton } from "./ui/admin-button";
import { AdminCard, AdminCardHeader } from "./ui/admin-card";
import { AdminField } from "./ui/admin-field";
import type { Presente } from "../../types/presente";
import { formatCurrencyInputBR } from "../../lib/utils/format-currency";
import { useAdminModal } from "./use-admin-modal";

type GiftsManagerProps = {
  eventoId: number;
  presentes: Presente[];
};

type GiftFormState = {
  id: number | null;
  nome: string;
  valor: string;
  descricao: string;
  imagem_url: string;
  usa_cotas: boolean;
  quantidade_total: string;
};

const initialForm: GiftFormState = {
  id: null,
  nome: "",
  valor: "",
  descricao: "",
  imagem_url: "",
  usa_cotas: false,
  quantidade_total: "1",
};

function getDisponiveis(presente: Presente) {
  const total = Number(presente.quantidade_total || 0);
  const reservadas = Number(presente.quantidade_reservada || 0);
  return Math.max(total - reservadas, 0);
}

function formatValorDisplay(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  if (/^r\$/i.test(trimmed)) {
    return trimmed.replace(/^r\$\s*/i, "R$ ");
  }

  return trimmed;
}

async function parseJsonResponse(response: Response) {
  const rawText = await response.text();

  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error(`Resposta inválida do servidor: ${rawText.slice(0, 180)}`);
  }
}

export function GiftsManager({ eventoId, presentes }: GiftsManagerProps) {
  const [giftList, setGiftList] = useState<Presente[]>(presentes);
  const [form, setForm] = useState<GiftFormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "">("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const modalTriggerRef = useRef<HTMLButtonElement | null>(null);

  const filteredGifts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const ordered = [...giftList].sort((a, b) => {
      const aReserved = Number(a.quantidade_reservada || 0);
      const bReserved = Number(b.quantidade_reservada || 0);
      if (bReserved !== aReserved) return bReserved - aReserved;
      return String(a.nome || "").localeCompare(String(b.nome || ""));
    });

    if (!normalizedSearch) return ordered;

    return ordered.filter((gift) => {
      const text = [
        gift.nome,
        gift.descricao,
        gift.valor,
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(normalizedSearch);
    });
  }, [giftList, search]);

  const stats = useMemo(() => {
    const totalPresentes = giftList.length;
    const totalReservas = giftList.reduce(
      (acc, item) => acc + Number(item.quantidade_reservada || 0),
      0,
    );
    const presentesComCotas = giftList.filter((item) => item.usa_cotas).length;
    const presentesReservados = giftList.filter(
      (item) => Number(item.quantidade_reservada || 0) > 0,
    ).length;

    return {
      totalPresentes,
      totalReservas,
      presentesComCotas,
      presentesReservados,
    };
  }, [giftList]);

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

  function handleChange<K extends keyof GiftFormState>(
    field: K,
    value: GiftFormState[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function openCreateModal() {
    resetForm();
    setIsModalOpen(true);
  }

  function openEditModal(presente: Presente) {
    setForm({
      id: Number(presente.id),
      nome: presente.nome || "",
      valor: presente.valor || "",
      descricao: presente.descricao || "",
      imagem_url: presente.imagem_url || "",
      usa_cotas: !!presente.usa_cotas,
      quantidade_total: String(presente.quantidade_total || 1),
    });

    setFeedback("");
    setFeedbackType("");
    setIsModalOpen(true);
  }

  async function handleImageUpload(file: File) {
    try {
      setUploadingImage(true);
      setFeedback("");
      setFeedbackType("");

      const body = new FormData();
      body.append("file", file);
      body.append("eventoId", String(eventoId));
      body.append("folder", "presentes");

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

  async function handleDelete(presente: Presente) {
    const confirmed = window.confirm(
      `Deseja excluir o presente "${presente.nome}"?`,
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setFeedback("");
      setFeedbackType("");

      const response = await fetch(
        `/api/admin/presentes?id=${presente.id}&evento_id=${eventoId}`,
        {
          method: "DELETE",
        },
      );

      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível excluir o presente.");
      }

      setGiftList((prev) =>
        prev.filter((item) => Number(item.id) !== Number(presente.id)),
      );

      setFeedback("Presente excluído com sucesso.");
      setFeedbackType("success");

      if (form.id === Number(presente.id)) {
        resetForm();
      }
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

    if (!form.nome.trim()) {
      setFeedback("Informe o nome do presente.");
      setFeedbackType("error");
      return;
    }

    if (form.usa_cotas) {
      const total = Number(form.quantidade_total || 0);
      if (!total || Number.isNaN(total) || total < 1) {
        setFeedback("Informe uma quantidade total válida para as cotas.");
        setFeedbackType("error");
        return;
      }
    }

    try {
      setLoading(true);
      setFeedback("");
      setFeedbackType("");

      const payload = {
        id: form.id || undefined,
        evento_id: eventoId,
        nome: form.nome.trim(),
        valor: formatValorDisplay(form.valor),
        descricao: form.descricao.trim() || null,
        imagem_url: form.imagem_url.trim() || null,
        usa_cotas: form.usa_cotas,
        quantidade_total: form.usa_cotas
          ? Number(form.quantidade_total || 1)
          : 1,
      };

      const response = await fetch("/api/admin/presentes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível salvar o presente.");
      }

      const savedGift = result.data as Presente;

      setGiftList((prev) => {
        const exists = prev.some((item) => Number(item.id) === Number(savedGift.id));

        if (exists) {
          return prev.map((item) =>
            Number(item.id) === Number(savedGift.id) ? savedGift : item,
          );
        }

        return [...prev, savedGift];
      });

      setFeedback(
        form.id
          ? "Presente atualizado com sucesso."
          : "Presente cadastrado com sucesso.",
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
          badge="Financeiro"
          title="Presentes e reservas"
          description="Gerencie os presentes exibidos no site, acompanhe as reservas e mantenha a organização financeira do evento."
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
              Adicionar presente
            </AdminButton>
          }
        />

        <div className="admin-overview-metrics">
          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Presentes</span>
            <strong className="admin-metric-value">{stats.totalPresentes}</strong>
            <p className="admin-metric-text">Itens cadastrados no evento.</p>
          </AdminCard>

          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Reservas</span>
            <strong className="admin-metric-value">{stats.totalReservas}</strong>
            <p className="admin-metric-text">Total de reservas registradas.</p>
          </AdminCard>

          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Com cotas</span>
            <strong className="admin-metric-value">{stats.presentesComCotas}</strong>
            <p className="admin-metric-text">Presentes que aceitam cotas.</p>
          </AdminCard>

          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Com movimento</span>
            <strong className="admin-metric-value">{stats.presentesReservados}</strong>
            <p className="admin-metric-text">Itens que já receberam reserva.</p>
          </AdminCard>
        </div>
      </section>

      <AdminCard>
        <AdminCardHeader
          title="Lista de presentes"
          description="Busque, revise e gerencie rapidamente os presentes cadastrados."
          rightSlot={
            <div className="admin-finance-search">
              <input
                type="search"
                placeholder="Buscar presente..."
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

        {filteredGifts.length === 0 ? (
          <div className="admin-empty-state">
            <strong>Nenhum presente encontrado</strong>
            <p>
              Ajuste a busca ou cadastre um novo item para começar a montar a
              lista de presentes.
            </p>
          </div>
        ) : (
          <div className="admin-gift-grid-refined">
            {filteredGifts.map((presente) => {
              const reservadas = Number(presente.quantidade_reservada || 0);
              const disponiveis = getDisponiveis(presente);

              return (
                <AdminCard key={presente.id} className="admin-gift-card-refined">
                  <div className="admin-gift-card-refined__top">
                    <div className="admin-gift-card-refined__title-block">
                      <div className="admin-gift-card-refined__badges">
                        <AdminBadge variant="neutral">
                          {presente.usa_cotas ? "Com cotas" : "Único"}
                        </AdminBadge>

                        {reservadas > 0 ? (
                          <AdminBadge variant="success">Com reservas</AdminBadge>
                        ) : (
                          <AdminBadge variant="default">Disponível</AdminBadge>
                        )}
                      </div>

                      <h3 className="admin-gift-card-refined__title">{presente.nome}</h3>

                      <p className="admin-gift-card-refined__price">
                        {presente.valor || "Valor não informado"}
                      </p>
                    </div>

                    {presente.imagem_url ? (
                      <div className="admin-gift-card-refined__thumb">
                        <img
                          src={presente.imagem_url}
                          alt={presente.nome}
                          className="admin-gift-card-refined__thumb-image"
                        />
                      </div>
                    ) : null}
                  </div>

                  {presente.descricao ? (
                    <p className="admin-gift-card-refined__description">
                      {presente.descricao}
                    </p>
                  ) : (
                    <p className="admin-gift-card-refined__description admin-gift-card-refined__description--muted">
                      Sem descrição cadastrada para este presente.
                    </p>
                  )}

                  <div className="admin-gift-card-refined__stats">
                    <div>
                      <span>Total</span>
                      <strong>{Number(presente.quantidade_total || 0)}</strong>
                    </div>

                    <div>
                      <span>Reservadas</span>
                      <strong>{reservadas}</strong>
                    </div>

                    <div>
                      <span>Disponíveis</span>
                      <strong>{disponiveis}</strong>
                    </div>
                  </div>

                  <div className="admin-gift-card-refined__actions">
                    <AdminButton
                      type="button"
                      variant="secondary"
                      onClick={(event) => {
                        modalTriggerRef.current = event.currentTarget;
                        event.currentTarget.focus();
                        openEditModal(presente);
                      }}
                      disabled={loading}
                      className="admin-gift-card-refined__button"
                    >
                      Editar
                    </AdminButton>

                    <AdminButton
                      type="button"
                      variant="danger"
                      onClick={() => handleDelete(presente)}
                      disabled={loading}
                      className="admin-gift-card-refined__button"
                    >
                      Excluir
                    </AdminButton>
                  </div>
                </AdminCard>
              );
            })}
          </div>
        )}
      </AdminCard>

      {isModalOpen ? (
        <div
          className="admin-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="admin-modal-card admin-modal-card--wide" role="dialog" aria-modal="true" aria-labelledby="gift-modal-title">
            <div className="admin-modal-header">
              <div className="admin-modal-title-wrap">
                <AdminBadge>{form.id ? "Editar presente" : "Novo presente"}</AdminBadge>
                <h3 id="gift-modal-title" className="admin-modal-title">
                  {form.id ? "Atualizar presente" : "Cadastrar presente"}
                </h3>
                <p className="admin-modal-subtitle">
                  Preencha os dados do item e organize melhor a experiência dos convidados.
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
                  title="Dados do presente"
                  description="Defina nome, valor, descrição e a estrutura de cotas."
                />

                <div className="admin-form-grid">
                  <AdminField label="Nome do presente" htmlFor="gift_nome">
                    <input
                      id="gift_nome"
                      type="text"
                      value={form.nome}
                      onChange={(e) => handleChange("nome", e.target.value)}
                      placeholder="Ex.: Jogo de toalha"
                    />
                  </AdminField>

                  <AdminField label="Valor" htmlFor="gift_valor">
                    <input
                      id="gift_valor"
                      type="text"
                      inputMode="decimal"
                      value={form.valor}
                      onChange={(e) => handleChange("valor", formatCurrencyInputBR(e.target.value))}
                      placeholder="R$ 120,00"
                    />
                  </AdminField>

                  <div className="admin-form-grid-full">
                    <AdminField label="Descrição" htmlFor="gift_descricao">
                      <textarea
                        id="gift_descricao"
                        rows={4}
                        value={form.descricao}
                        onChange={(e) => handleChange("descricao", e.target.value)}
                        placeholder="Descreva o presente e, se quiser, deixe a mensagem mais humana."
                      />
                    </AdminField>
                  </div>

                  <div className="admin-form-grid-full">
                    <div className="admin-switch-card">
                      <div className="admin-switch-card__content">
                        <strong>Este presente usa cotas</strong>
                        <p>
                          Ative quando o item puder ser reservado em partes, como
                          cotas de contribuição.
                        </p>
                      </div>

                      <label className="admin-switch">
                        <input
                          id="gift_usa_cotas"
                          type="checkbox"
                          checked={form.usa_cotas}
                          onChange={(e) => handleChange("usa_cotas", e.target.checked)}
                        />
                        <span className="admin-switch__slider" />
                      </label>
                    </div>
                  </div>

                  <AdminField
                    label="Quantidade total"
                    htmlFor="gift_quantidade_total"
                    hint={form.usa_cotas ? "Quantidade total de cotas disponíveis." : "Para presente único, permanece 1."}
                  >
                    <input
                      id="gift_quantidade_total"
                      type="number"
                      min={1}
                      value={form.usa_cotas ? form.quantidade_total : "1"}
                      onChange={(e) => handleChange("quantidade_total", e.target.value)}
                      disabled={!form.usa_cotas}
                    />
                  </AdminField>
                </div>
              </AdminCard>

              <AdminCard>
                <AdminCardHeader
                  title="Imagem"
                  description="Envie a imagem do presente para melhorar a leitura visual no site."
                />

                <div className="admin-form-grid">
                  <div className="admin-form-grid-full">
                    <AdminField
                      label="Imagem do presente"
                      htmlFor="gift_imagem_upload"
                      hint="O upload preenche a URL automaticamente."
                    >
                      <input
                        id="gift_imagem_upload"
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
                      htmlFor="gift_imagem_url"
                    >
                      <input
                        id="gift_imagem_url"
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
                            alt="Prévia do presente"
                            className="admin-upload-preview-image"
                          />
                        </div>
                      </AdminField>
                    </div>
                  ) : null}
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
                      Revise os dados e salve quando terminar.
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
                        : "Cadastrar presente"}
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
