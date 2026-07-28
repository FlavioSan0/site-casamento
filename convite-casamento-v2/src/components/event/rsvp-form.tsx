"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatPhoneBR } from "../../lib/utils/format-phone";

type RsvpFormProps = {
  eventoId: number;
  dataLimiteConfirmacao: string | null;
  mensagemConfirmacao: string | null;
  maxAcompanhantes: number;
};

type FormState = {
  nome: string;
  telefone: string;
  comparecera: "sim" | "nao" | "";
  acompanhantes: string[];
  observacoes: string;
};

type FieldErrors = Partial<Record<"nome" | "comparecera" | "acompanhantes", string>>;

function formatDateBR(dateString: string | null) {
  if (!dateString) return null;

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("pt-BR");
}

function isExpired(dateString: string | null) {
  if (!dateString) return false;

  const now = new Date();
  const limit = new Date(`${dateString}T23:59:59`);
  return now > limit;
}

export function RsvpForm({
  eventoId,
  dataLimiteConfirmacao,
  mensagemConfirmacao,
  maxAcompanhantes,
}: RsvpFormProps) {
  const [form, setForm] = useState<FormState>({
    nome: "",
    telefone: "",
    comparecera: "",
    acompanhantes: [],
    observacoes: "",
  });

  const [quantidadeAcompanhantes, setQuantidadeAcompanhantes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "">("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const focusFrameRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (focusFrameRef.current !== null) {
        window.cancelAnimationFrame(focusFrameRef.current);
      }
    },
    [],
  );

  const deadlineFormatted = useMemo(
    () => formatDateBR(dataLimiteConfirmacao),
    [dataLimiteConfirmacao],
  );

  const deadlineExpired = useMemo(
    () => isExpired(dataLimiteConfirmacao),
    [dataLimiteConfirmacao],
  );

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (field === "nome" || field === "comparecera") {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function handleQuantidadeAcompanhantes(value: number) {
    const safeValue = Math.max(0, Math.min(value, maxAcompanhantes));
    setQuantidadeAcompanhantes(safeValue);

    setForm((prev) => {
      const novosAcompanhantes = [...prev.acompanhantes];

      if (safeValue > novosAcompanhantes.length) {
        while (novosAcompanhantes.length < safeValue) {
          novosAcompanhantes.push("");
        }
      } else {
        novosAcompanhantes.length = safeValue;
      }

      return {
        ...prev,
        acompanhantes: novosAcompanhantes,
      };
    });
  }

  function updateAcompanhante(index: number, value: string) {
    setForm((prev) => {
      const acompanhantes = [...prev.acompanhantes];
      acompanhantes[index] = value;

      return {
        ...prev,
        acompanhantes,
      };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    if (deadlineExpired) {
      setFeedback("O prazo para confirmação já foi encerrado.");
      setFeedbackType("error");
      return;
    }

    const errors: FieldErrors = {};
    if (!form.nome.trim()) errors.nome = "Informe seu nome completo.";
    if (!form.comparecera) errors.comparecera = "Selecione uma opção.";
    if (
      form.comparecera === "sim" &&
      form.acompanhantes.some((item) => !item.trim())
    ) {
      errors.acompanhantes = "Preencha o nome de cada acompanhante.";
    }

    const firstInvalid = (["nome", "comparecera", "acompanhantes"] as const).find(
      (field) => errors[field],
    );
    if (firstInvalid) {
      setFieldErrors(errors);
      setFeedback("Revise os campos indicados.");
      setFeedbackType("error");
      const targetId =
        firstInvalid === "acompanhantes" ? "acompanhante_0" : firstInvalid;
      if (focusFrameRef.current !== null) {
        window.cancelAnimationFrame(focusFrameRef.current);
      }
      focusFrameRef.current = window.requestAnimationFrame(() => {
        document.getElementById(targetId)?.focus();
        focusFrameRef.current = null;
      });
      return;
    }

    try {
      setLoading(true);
      setFeedback("");
      setFeedbackType("");

      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          evento_id: eventoId,
          nome: form.nome.trim(),
          telefone: form.telefone.trim() || null,
          presenca: form.comparecera,
          acompanhantes: form.comparecera === "sim" ? form.acompanhantes.length : 0,
          nomes_acompanhantes:
            form.comparecera === "sim"
              ? form.acompanhantes.map((item) => item.trim()).filter(Boolean)
              : [],
          observacoes: form.observacoes.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível enviar a confirmação.");
      }

      setFeedback(
        mensagemConfirmacao?.trim() ||
          "Confirmação enviada com sucesso. Obrigado por fazer parte desse momento.",
      );
      setFeedbackType("success");
      setFieldErrors({});

      setForm({
        nome: "",
        telefone: "",
        comparecera: "",
        acompanhantes: [],
        observacoes: "",
      });
      setQuantidadeAcompanhantes(0);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a confirmação.";
      setFeedback(message);
      setFeedbackType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="event-section rsvp-section">
      <div className="rsvp-layout">
        <div className="rsvp-copy">
          <span className="section-badge">RSVP</span>
          <h2 className="section-title">Confirme sua presença</h2>
          <p className="section-description">
            Preencha os dados ao lado para registrar sua resposta e, se necessário,
            informar acompanhantes.
          </p>

          {deadlineFormatted ? (
            <div
              className={`deadline-box ${
                deadlineExpired ? "deadline-box--expired" : ""
              }`}
            >
              {deadlineExpired ? (
                <p>
                  O prazo de confirmação encerrou em <strong>{deadlineFormatted}</strong>.
                </p>
              ) : (
                <p>
                  Confirmações disponíveis até <strong>{deadlineFormatted}</strong>.
                </p>
              )}
            </div>
          ) : null}

          <div className="rsvp-copy-card">
            <strong>Importante</strong>
            <p>
              Sua confirmação nos ajuda a organizar melhor os detalhes do evento e
              receber todos com mais cuidado.
            </p>
          </div>
        </div>

        <div className="rsvp-form-wrap">
          <form className="rsvp-form-refined" onSubmit={handleSubmit} noValidate>
            <div className="rsvp-form-grid">
              <div className="form-field">
                <label htmlFor="nome">Seu nome <span aria-hidden="true">*</span></label>
                <input
                  id="nome"
                  type="text"
                  value={form.nome}
                  onChange={(e) => updateField("nome", e.target.value)}
                  placeholder="Digite seu nome completo"
                  maxLength={120}
                  autoComplete="name"
                  required
                  aria-invalid={Boolean(fieldErrors.nome)}
                  aria-describedby={fieldErrors.nome ? "nome-error" : undefined}
                  disabled={loading || deadlineExpired}
                />
                {fieldErrors.nome ? <p id="nome-error" className="field-error">{fieldErrors.nome}</p> : null}
              </div>

              <div className="form-field">
                <label htmlFor="telefone">Telefone</label>
                <input
                  id="telefone"
                  type="tel"
                  inputMode="tel"
                  value={form.telefone}
                  onChange={(e) => updateField("telefone", formatPhoneBR(e.target.value))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  autoComplete="tel"
                  disabled={loading || deadlineExpired}
                />
              </div>

              <div className="form-field form-field--full">
                <label htmlFor="comparecera">Você irá comparecer? <span aria-hidden="true">*</span></label>
                <select
                  id="comparecera"
                  value={form.comparecera}
                  onChange={(e) =>
                    updateField("comparecera", e.target.value as "sim" | "nao" | "")
                  }
                  required
                  aria-invalid={Boolean(fieldErrors.comparecera)}
                  aria-describedby={fieldErrors.comparecera ? "comparecera-error" : undefined}
                  disabled={loading || deadlineExpired}
                >
                  <option value="">Selecione uma opção</option>
                  <option value="sim">Sim, irei comparecer</option>
                  <option value="nao">Não poderei comparecer</option>
                </select>
                {fieldErrors.comparecera ? <p id="comparecera-error" className="field-error">{fieldErrors.comparecera}</p> : null}
              </div>
            </div>

            {form.comparecera === "sim" && maxAcompanhantes > 0 ? (
              <div className="rsvp-companions-card">
                <div className="rsvp-companions-card__header">
                  <strong>Acompanhantes</strong>
                  <span>
                    Você pode informar até {maxAcompanhantes} acompanhante(s).
                  </span>
                </div>

                <div className="form-field">
                  <label htmlFor="quantidade_acompanhantes">
                    Quantos acompanhantes?
                  </label>
                  <select
                    id="quantidade_acompanhantes"
                    value={quantidadeAcompanhantes}
                    onChange={(e) =>
                      handleQuantidadeAcompanhantes(Number(e.target.value))
                    }
                    disabled={loading || deadlineExpired}
                  >
                    {Array.from({ length: maxAcompanhantes + 1 }).map((_, index) => (
                      <option key={index} value={index}>
                        {index}
                      </option>
                    ))}
                  </select>
                </div>

                {quantidadeAcompanhantes > 0 ? (
                  <div className="rsvp-companions-grid">
                    {form.acompanhantes.map((acompanhante, index) => (
                      <div className="form-field" key={index}>
                        <label htmlFor={`acompanhante_${index}`}>
                          Acompanhante {index + 1}
                        </label>
                        <input
                          id={`acompanhante_${index}`}
                          type="text"
                          value={acompanhante}
                          onChange={(e) => updateAcompanhante(index, e.target.value)}
                          placeholder={`Nome do acompanhante ${index + 1}`}
                          maxLength={120}
                          autoComplete="name"
                          required
                          aria-invalid={Boolean(fieldErrors.acompanhantes && !acompanhante.trim())}
                          aria-describedby={fieldErrors.acompanhantes ? "acompanhantes-error" : undefined}
                          disabled={loading || deadlineExpired}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
                {fieldErrors.acompanhantes ? <p id="acompanhantes-error" className="field-error">{fieldErrors.acompanhantes}</p> : null}
              </div>
            ) : null}

            <div className="form-field">
              <label htmlFor="observacoes">Observações</label>
              <textarea
                id="observacoes"
                value={form.observacoes}
                onChange={(e) => updateField("observacoes", e.target.value)}
                placeholder="Se desejar, deixe uma observação"
                rows={5}
                maxLength={1000}
                disabled={loading || deadlineExpired}
              />
            </div>

            {feedback ? (
              <p
                className={`form-feedback ${
                  feedbackType === "error"
                    ? "form-feedback--error"
                    : "form-feedback--success"
                }`}
                role={feedbackType === "error" ? "alert" : "status"}
                aria-live="polite"
              >
                {feedback}
              </p>
            ) : null}

            <button
              type="submit"
              className="event-button rsvp-submit-button"
              disabled={loading || deadlineExpired}
            >
              {loading ? "Enviando confirmação..." : "Confirmar presença"}
            </button>
            {feedbackType === "success" ? (
              <a className="rsvp-gifts-link" href="#presentes">
                Ver opções de presentes
              </a>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}
