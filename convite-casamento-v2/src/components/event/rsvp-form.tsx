"use client";

import { useMemo, useState } from "react";

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

    if (deadlineExpired) {
      setFeedback("O prazo para confirmação já foi encerrado.");
      setFeedbackType("error");
      return;
    }

    if (!form.nome.trim()) {
      setFeedback("Informe seu nome.");
      setFeedbackType("error");
      return;
    }

    if (!form.comparecera) {
      setFeedback("Selecione se você irá comparecer.");
      setFeedbackType("error");
      return;
    }

    if (form.comparecera === "sim") {
      const acompanhantesInvalidos = form.acompanhantes.some((item) => !item.trim());

      if (acompanhantesInvalidos) {
        setFeedback("Preencha os nomes de todos os acompanhantes informados.");
        setFeedbackType("error");
        return;
      }
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
          comparecera: form.comparecera === "sim",
          acompanhantes:
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
          <form className="rsvp-form-refined" onSubmit={handleSubmit}>
            <div className="rsvp-form-grid">
              <div className="form-field">
                <label htmlFor="nome">Seu nome</label>
                <input
                  id="nome"
                  type="text"
                  value={form.nome}
                  onChange={(e) => updateField("nome", e.target.value)}
                  placeholder="Digite seu nome completo"
                  disabled={loading || deadlineExpired}
                />
              </div>

              <div className="form-field">
                <label htmlFor="telefone">Telefone</label>
                <input
                  id="telefone"
                  type="text"
                  value={form.telefone}
                  onChange={(e) => updateField("telefone", e.target.value)}
                  placeholder="Digite seu telefone"
                  disabled={loading || deadlineExpired}
                />
              </div>

              <div className="form-field form-field--full">
                <label htmlFor="comparecera">Você irá comparecer?</label>
                <select
                  id="comparecera"
                  value={form.comparecera}
                  onChange={(e) =>
                    updateField("comparecera", e.target.value as "sim" | "nao" | "")
                  }
                  disabled={loading || deadlineExpired}
                >
                  <option value="">Selecione uma opção</option>
                  <option value="sim">Sim, irei comparecer</option>
                  <option value="nao">Não poderei comparecer</option>
                </select>
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
                          disabled={loading || deadlineExpired}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
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
          </form>
        </div>
      </div>
    </section>
  );
}