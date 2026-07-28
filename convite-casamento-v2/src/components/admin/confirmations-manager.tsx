"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminSectionHeader } from "./admin-section-header";
import { AdminBadge } from "./ui/admin-badge";
import { AdminButton } from "./ui/admin-button";
import { AdminCard, AdminCardHeader } from "./ui/admin-card";
import { AdminField } from "./ui/admin-field";

type Confirmacao = {
  id: number;
  evento_id: number;
  nome: string;
  telefone: string | null;
  acompanhantes: number;
  nomes_acompanhantes: string[] | null;
  presenca: string;
  observacoes: string | null;
  created_at?: string;
};

type ConfirmationsManagerProps = {
  eventoId: number;
  confirmacoes: Confirmacao[];
  maxAcompanhantes?: number;
};

type ConfirmationFormState = {
  id: number | null;
  nome: string;
  telefone: string;
  acompanhantes: string;
  nomes_acompanhantes: string[];
  presenca: string;
  observacoes: string;
};

const initialForm: ConfirmationFormState = {
  id: null,
  nome: "",
  telefone: "",
  acompanhantes: "0",
  nomes_acompanhantes: [],
  presenca: "",
  observacoes: "",
};

function normalizePhone(value: string) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
}

function acompanhantesToArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

async function parseJsonResponse(response: Response) {
  const rawText = await response.text();

  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error(`Resposta inválida do servidor: ${rawText.slice(0, 180)}`);
  }
}

export function ConfirmationsManager({
  eventoId,
  confirmacoes,
  maxAcompanhantes = 4,
}: ConfirmationsManagerProps) {
  const [confirmationList, setConfirmationList] = useState<Confirmacao[]>(confirmacoes);
  const [form, setForm] = useState<ConfirmationFormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "">("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const sortedConfirmations = useMemo(() => {
    const ordered = [...confirmationList].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return ordered;

    return ordered.filter((item) => {
      const haystack = [
        item.nome,
        item.telefone,
        item.presenca,
        ...(acompanhantesToArray(item.nomes_acompanhantes) || []),
        item.observacoes,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [confirmationList, search]);

  const stats = useMemo(() => {
    const total = confirmationList.length;
    const confirmados = confirmationList.filter(
      (item) => item.presenca === "Sim, estarei presente",
    ).length;
    const ausentes = confirmationList.filter(
      (item) => item.presenca === "Não poderei comparecer",
    ).length;
    const acompanhantes = confirmationList.reduce(
      (acc, item) => acc + Number(item.acompanhantes || 0),
      0,
    );
    const totalConvidados = confirmationList.reduce(
      (acc, item) => acc + 1 + Number(item.acompanhantes || 0),
      0,
    );

    return {
      total,
      confirmados,
      ausentes,
      acompanhantes,
      totalConvidados,
    };
  }, [confirmationList]);

  const resetForm = useCallback(() => {
    setForm(initialForm);
    setFeedback("");
    setFeedbackType("");
  }, []);

  const closeModal = useCallback(() => {
    if (loading) return;
    setIsModalOpen(false);
    resetForm();
  }, [loading, resetForm]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) {
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
  }, [isModalOpen, loading, closeModal]);

  function handleChange<K extends keyof ConfirmationFormState>(
    field: K,
    value: ConfirmationFormState[K],
  ) {
    if (field === "telefone" && typeof value === "string") {
      setForm((prev) => ({
        ...prev,
        telefone: normalizePhone(value),
      }));
      return;
    }

    if (field === "acompanhantes" && typeof value === "string") {
      let total = Number(value || 0);

      if (Number.isNaN(total) || total < 0) total = 0;
      if (total > maxAcompanhantes) total = maxAcompanhantes;

      setForm((prev) => {
        const nextNames = [...prev.nomes_acompanhantes];

        if (nextNames.length < total) {
          while (nextNames.length < total) nextNames.push("");
        }

        if (nextNames.length > total) {
          nextNames.length = total;
        }

        return {
          ...prev,
          acompanhantes: String(total),
          nomes_acompanhantes: nextNames,
        };
      });

      return;
    }

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleAcompanhanteChange(index: number, value: string) {
    setForm((prev) => {
      const next = [...prev.nomes_acompanhantes];
      next[index] = value;
      return {
        ...prev,
        nomes_acompanhantes: next,
      };
    });
  }

  function openEditModal(confirmacao: Confirmacao) {
    const acompanhantes = Math.min(
      Number(confirmacao.acompanhantes || 0),
      maxAcompanhantes,
    );
    const nomes = acompanhantesToArray(confirmacao.nomes_acompanhantes);

    while (nomes.length < acompanhantes) nomes.push("");
    if (nomes.length > acompanhantes) nomes.length = acompanhantes;

    setForm({
      id: Number(confirmacao.id),
      nome: confirmacao.nome || "",
      telefone: confirmacao.telefone || "",
      acompanhantes: String(acompanhantes),
      nomes_acompanhantes: nomes,
      presenca: confirmacao.presenca || "",
      observacoes: confirmacao.observacoes || "",
    });

    setFeedback("");
    setFeedbackType("");
    setIsModalOpen(true);
  }

  async function handleDelete(confirmacao: Confirmacao) {
    const confirmed = window.confirm(
      `Deseja excluir a confirmação de "${confirmacao.nome}"?`,
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setFeedback("");
      setFeedbackType("");

      const response = await fetch(
        `/api/admin/confirmacoes?id=${confirmacao.id}&evento_id=${eventoId}`,
        {
          method: "DELETE",
        },
      );

      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível excluir a confirmação.");
      }

      setConfirmationList((prev) =>
        prev.filter((item) => Number(item.id) !== Number(confirmacao.id)),
      );

      setFeedback("Confirmação excluída com sucesso.");
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

    if (!form.id) {
      setFeedback("ID da confirmação inválido.");
      setFeedbackType("error");
      return;
    }

    if (!form.nome.trim()) {
      setFeedback("Informe o nome.");
      setFeedbackType("error");
      return;
    }

    if (!form.presenca.trim()) {
      setFeedback("Informe a presença.");
      setFeedbackType("error");
      return;
    }

    const acompanhantes = Number(form.acompanhantes || 0);

    if (Number.isNaN(acompanhantes) || acompanhantes < 0) {
      setFeedback("Quantidade de acompanhantes inválida.");
      setFeedbackType("error");
      return;
    }

    if (acompanhantes > maxAcompanhantes) {
      setFeedback(
        `O limite configurado para este evento é de até ${maxAcompanhantes} acompanhante(s).`,
      );
      setFeedbackType("error");
      return;
    }

    const nomesAcompanhantes = form.nomes_acompanhantes
      .map((item) => item.trim())
      .filter(Boolean);

    if (acompanhantes > 0 && nomesAcompanhantes.length !== acompanhantes) {
      setFeedback("Preencha o nome de todos os acompanhantes.");
      setFeedbackType("error");
      return;
    }

    try {
      setLoading(true);
      setFeedback("");
      setFeedbackType("");

      const response = await fetch("/api/admin/confirmacoes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: form.id,
          evento_id: eventoId,
          nome: form.nome.trim(),
          telefone: form.telefone.trim() || null,
          acompanhantes,
          nomes_acompanhantes: acompanhantes > 0 ? nomesAcompanhantes : null,
          presenca: form.presenca,
          observacoes: form.observacoes.trim() || null,
        }),
      });

      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível salvar a confirmação.");
      }

      const updated = result.data as Confirmacao;

      setConfirmationList((prev) =>
        prev.map((item) =>
          Number(item.id) === Number(updated.id) ? updated : item,
        ),
      );

      setFeedback("Confirmação atualizada com sucesso.");
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
          badge="Convidados"
          title="Confirmações e presença"
          description="Acompanhe respostas do RSVP, consulte acompanhantes e ajuste os dados dos convidados com mais clareza."
        />

        <div className="admin-overview-metrics">
          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Confirmações</span>
            <strong className="admin-metric-value">{stats.total}</strong>
            <p className="admin-metric-text">Total de respostas registradas.</p>
          </AdminCard>

          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Total de convidados</span>
            <strong className="admin-metric-value">{stats.totalConvidados}</strong>
            <p className="admin-metric-text">
              Soma de convidados principais com todos os acompanhantes.
            </p>
          </AdminCard>

          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Confirmados</span>
            <strong className="admin-metric-value">{stats.confirmados}</strong>
            <p className="admin-metric-text">Presenças marcadas como confirmadas.</p>
          </AdminCard>

          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Ausências</span>
            <strong className="admin-metric-value">{stats.ausentes}</strong>
            <p className="admin-metric-text">Convidados que não poderão comparecer.</p>
          </AdminCard>
        </div>
      </section>

      <AdminCard>
        <AdminCardHeader
          title="Lista de confirmações"
          description={`Busque por nome, telefone, acompanhantes ou observações. Limite atual de acompanhantes por convidado: ${maxAcompanhantes}.`}
          rightSlot={
            <div className="admin-finance-search">
              <input
                type="text"
                placeholder="Buscar convidado..."
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

        {sortedConfirmations.length === 0 ? (
          <div className="admin-empty-state">
            <strong>Nenhuma confirmação encontrada</strong>
            <p>
              Ajuste a busca ou aguarde novas respostas do formulário de presença.
            </p>
          </div>
        ) : (
          <div className="admin-confirmation-grid-refined">
            {sortedConfirmations.map((confirmacao) => {
              const acompanhantesNomes = acompanhantesToArray(
                confirmacao.nomes_acompanhantes,
              );
              const confirmed =
                confirmacao.presenca === "Sim, estarei presente";

              return (
                <AdminCard
                  key={confirmacao.id}
                  className="admin-confirmation-card-refined"
                >
                  <div className="admin-confirmation-card-refined__top">
                    <div className="admin-confirmation-card-refined__info">
                      <div className="admin-confirmation-card-refined__badges">
                        <AdminBadge variant={confirmed ? "success" : "danger"}>
                          {confirmacao.presenca}
                        </AdminBadge>

                        <AdminBadge variant="neutral">
                          {Number(confirmacao.acompanhantes || 0)} acompanhante(s)
                        </AdminBadge>
                      </div>

                      <h3 className="admin-confirmation-card-refined__title">
                        {confirmacao.nome}
                      </h3>

                      <p className="admin-confirmation-card-refined__subtitle">
                        {confirmacao.telefone || "Telefone não informado"}
                      </p>
                    </div>

                    <div className="admin-confirmation-card-refined__meta">
                      <span>Recebido em</span>
                      <strong>{formatDate(confirmacao.created_at)}</strong>
                    </div>
                  </div>

                  {acompanhantesNomes.length > 0 ? (
                    <div className="admin-confirmation-block">
                      <strong>Nomes dos acompanhantes</strong>
                      <p>{acompanhantesNomes.join(", ")}</p>
                    </div>
                  ) : null}

                  {confirmacao.observacoes ? (
                    <div className="admin-confirmation-block">
                      <strong>Observações</strong>
                      <p>{confirmacao.observacoes}</p>
                    </div>
                  ) : (
                    <div className="admin-confirmation-block admin-confirmation-block--muted">
                      <strong>Observações</strong>
                      <p>Sem observações registradas.</p>
                    </div>
                  )}

                  <div className="admin-confirmation-card-refined__actions">
                    <AdminButton
                      type="button"
                      variant="secondary"
                      onClick={() => openEditModal(confirmacao)}
                      disabled={loading}
                      className="admin-confirmation-card-refined__button"
                    >
                      Editar
                    </AdminButton>

                    <AdminButton
                      type="button"
                      variant="danger"
                      onClick={() => handleDelete(confirmacao)}
                      disabled={loading}
                      className="admin-confirmation-card-refined__button"
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
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="admin-modal-card admin-modal-card--wide">
            <div className="admin-modal-header">
              <div className="admin-modal-title-wrap">
                <AdminBadge>Editar confirmação</AdminBadge>
                <h3 className="admin-modal-title">Atualizar confirmação</h3>
                <p className="admin-modal-subtitle">
                  Ajuste os dados do convidado, a presença e os acompanhantes.
                </p>
              </div>

              <button
                type="button"
                className="admin-modal-close"
                onClick={closeModal}
                disabled={loading}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <form className="admin-form-stack" onSubmit={handleSubmit}>
              <AdminCard>
                <AdminCardHeader
                  title="Dados principais"
                  description="Edite as informações centrais desta confirmação."
                />

                <div className="admin-form-grid">
                  <AdminField label="Nome" htmlFor="confirmacao_nome">
                    <input
                      id="confirmacao_nome"
                      type="text"
                      value={form.nome}
                      onChange={(e) => handleChange("nome", e.target.value)}
                    />
                  </AdminField>

                  <AdminField label="Telefone" htmlFor="confirmacao_telefone">
                    <input
                      id="confirmacao_telefone"
                      type="text"
                      value={form.telefone}
                      onChange={(e) => handleChange("telefone", e.target.value)}
                      placeholder="(84) 99999-9999"
                    />
                  </AdminField>

                  <AdminField
                    label="Quantidade de acompanhantes"
                    htmlFor="confirmacao_acompanhantes"
                    hint={`Limite atual: até ${maxAcompanhantes} acompanhante(s).`}
                  >
                    <input
                      id="confirmacao_acompanhantes"
                      type="number"
                      min={0}
                      max={maxAcompanhantes}
                      value={form.acompanhantes}
                      onChange={(e) =>
                        handleChange("acompanhantes", e.target.value)
                      }
                    />
                  </AdminField>

                  <AdminField label="Presença" htmlFor="confirmacao_presenca">
                    <select
                      id="confirmacao_presenca"
                      value={form.presenca}
                      onChange={(e) => handleChange("presenca", e.target.value)}
                    >
                      <option value="">Selecione</option>
                      <option value="Sim, estarei presente">
                        Sim, estarei presente
                      </option>
                      <option value="Não poderei comparecer">
                        Não poderei comparecer
                      </option>
                    </select>
                  </AdminField>

                  {Number(form.acompanhantes || 0) > 0 ? (
                    <div className="admin-form-grid-full">
                      <AdminCard className="admin-inner-soft-card">
                        <AdminCardHeader
                          title="Acompanhantes"
                          description="Preencha o nome de cada acompanhante informado."
                        />

                        <div className="admin-inline-stack">
                          {Array.from({
                            length: Number(form.acompanhantes || 0),
                          }).map((_, index) => (
                            <AdminField
                              key={`acompanhante-${index + 1}`}
                              label={`Acompanhante ${index + 1}`}
                            >
                              <input
                                type="text"
                                value={form.nomes_acompanhantes[index] || ""}
                                onChange={(e) =>
                                  handleAcompanhanteChange(index, e.target.value)
                                }
                                placeholder={`Nome do acompanhante ${index + 1}`}
                              />
                            </AdminField>
                          ))}
                        </div>
                      </AdminCard>
                    </div>
                  ) : null}

                  <div className="admin-form-grid-full">
                    <AdminField
                      label="Observações"
                      htmlFor="confirmacao_observacoes"
                    >
                      <textarea
                        id="confirmacao_observacoes"
                        rows={4}
                        value={form.observacoes}
                        onChange={(e) =>
                          handleChange("observacoes", e.target.value)
                        }
                      />
                    </AdminField>
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
                      Revise os dados e salve quando terminar.
                    </span>
                  )}
                </div>

                <div className="admin-submit-bar__actions">
                  <AdminButton
                    type="button"
                    variant="secondary"
                    onClick={closeModal}
                    disabled={loading}
                  >
                    Cancelar
                  </AdminButton>

                  <AdminButton
                    type="submit"
                    variant="primary"
                    disabled={loading}
                  >
                    {loading ? "Salvando..." : "Salvar alterações"}
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