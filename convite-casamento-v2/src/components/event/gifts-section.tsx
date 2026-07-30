"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { Presente } from "../../types/presente";

type GiftsSectionProps = {
  eventoId: number;
  presentes: Presente[];
};

type FeedbackState = {
  type: "success" | "error" | "";
  message: string;
};

function formatCurrency(value: string | number | null) {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    if (Number.isNaN(value)) return null;
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  const text = value.trim();
  if (!text) return null;
  if (/^r\$/i.test(text)) return text.replace(/^r\$\s*/i, "R$ ");

  const numericText = text
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const numericValue = Number(numericText);

  if (!Number.isNaN(numericValue) && /^\d+(?:[.,]\d{1,2})?$/.test(text)) {
    return numericValue.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return text;
}

function getDisponibilidade(presente: Presente) {
  const usaCotas = Boolean(presente.usa_cotas);
  const total = Math.max(Number(presente.quantidade_total || 1), 1);
  const reservadas = Math.max(Number(presente.quantidade_reservada || 0), 0);
  const restantes = Math.max(total - reservadas, 0);
  const bloqueadoPorStatus = presente.status === "reservado";

  if (usaCotas) {
    return {
      disponivel: restantes > 0 && !bloqueadoPorStatus,
      restantes,
      total,
      reservadas,
    };
  }

  const disponivel = reservadas <= 0 && !bloqueadoPorStatus;

  return {
    disponivel,
    restantes: disponivel ? 1 : 0,
    total: 1,
    reservadas: disponivel ? 0 : 1,
  };
}

export function GiftsSection({ eventoId, presentes }: GiftsSectionProps) {
  const [giftList, setGiftList] = useState<Presente[]>(presentes);
  const [nomesReserva, setNomesReserva] = useState<Record<number, string>>({});
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [feedbackByGift, setFeedbackByGift] = useState<Record<number, FeedbackState>>({});

  const presentesOrdenados = useMemo(() => {
    return [...giftList].sort((a, b) => {
      const disponibilidadeA = getDisponibilidade(a);
      const disponibilidadeB = getDisponibilidade(b);

      if (disponibilidadeA.disponivel !== disponibilidadeB.disponivel) {
        return Number(disponibilidadeB.disponivel) - Number(disponibilidadeA.disponivel);
      }

      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }, [giftList]);

  async function reservarPresente(presente: Presente) {
    const nomeReserva = (nomesReserva[presente.id] || "").trim();
    const disponibilidade = getDisponibilidade(presente);

    if (!nomeReserva) {
      setFeedbackByGift((prev) => ({
        ...prev,
        [presente.id]: {
          type: "error",
          message: "Informe seu nome para reservar.",
        },
      }));
      return;
    }

    if (!disponibilidade.disponivel) {
      setFeedbackByGift((prev) => ({
        ...prev,
        [presente.id]: {
          type: "error",
          message: "Este presente não está mais disponível.",
        },
      }));
      return;
    }

    try {
      setLoadingId(presente.id);
      setFeedbackByGift((prev) => ({
        ...prev,
        [presente.id]: { type: "", message: "" },
      }));

      const response = await fetch("/api/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          evento_id: eventoId,
          presente_id: presente.id,
          reservado_por: nomeReserva,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível realizar a reserva.");
      }

      const quantidadeReservada = Number(
        result?.data?.quantidade_reservada ?? presente.quantidade_reservada + 1,
      );
      const status = String(result?.data?.status || presente.status || "disponivel");

      setGiftList((prev) =>
        prev.map((item) =>
          item.id === presente.id
            ? {
                ...item,
                quantidade_reservada: quantidadeReservada,
                status,
              }
            : item,
        ),
      );

      setFeedbackByGift((prev) => ({
        ...prev,
        [presente.id]: {
          type: "success",
          message: result?.message || "Reserva realizada com sucesso.",
        },
      }));

      setNomesReserva((prev) => ({
        ...prev,
        [presente.id]: "",
      }));
      setExpandedId(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível realizar a reserva.";

      setFeedbackByGift((prev) => ({
        ...prev,
        [presente.id]: {
          type: "error",
          message,
        },
      }));
    } finally {
      setLoadingId(null);
    }
  }

  if (!presentesOrdenados.length) return null;

  return (
    <section id="presentes" className="event-section gifts-section-refined">
      <div className="gifts-section-refined__header">
        <div className="gifts-section-refined__copy">
          <span className="section-badge">Presentes</span>
          <h2 className="section-title">Escolha um presente especial</h2>
          <p className="section-description">
            Selecionamos algumas opções com carinho. Caso deseje, você pode reservar
            um presente disponível abaixo.
          </p>
        </div>
      </div>

      <div className="gift-grid-refined gift-grid-refined--enhanced">
        {presentesOrdenados.map((presente, index) => {
          const disponibilidade = getDisponibilidade(presente);
          const feedback = feedbackByGift[presente.id];
          const loading = loadingId === presente.id;
          const valorFormatado = formatCurrency(presente.valor);

          return (
            <article
              key={presente.id}
              data-reveal-item
              style={{ "--gift-reveal-index": Math.min(index, 5) } as React.CSSProperties}
              className={`gift-card-refined ${
                !disponibilidade.disponivel ? "gift-card-refined--disabled" : ""
              }`}
            >
              {presente.imagem_url ? (
                <div className="gift-card-refined__image-wrap">
                  <Image
                    src={presente.imagem_url}
                    alt={presente.nome}
                    fill
                    sizes="(max-width: 900px) 100vw, 50vw"
                    className="gift-card-refined__image"
                  />
                </div>
              ) : (
                <div className="gift-card-refined__image-wrap gift-card-refined__image-wrap--empty">
                  <span>Presente</span>
                </div>
              )}

              <div className="gift-card-refined__body">
                <div className="gift-card-refined__top">
                  <div className="gift-card-refined__title-wrap">
                    <h3 className="gift-card-refined__title">{presente.nome}</h3>
                    {valorFormatado ? (
                      <span className="gift-card-refined__price">{valorFormatado}</span>
                    ) : null}
                  </div>

                  <span
                    className={`gift-status ${
                      disponibilidade.disponivel
                        ? "gift-status--available"
                        : "gift-status--reserved"
                    }`}
                  >
                    {disponibilidade.disponivel ? "Disponível" : "Reservado"}
                  </span>
                </div>

                {presente.descricao ? (
                  <p className="gift-card-refined__description">{presente.descricao}</p>
                ) : null}

                {presente.usa_cotas ? (
                  <div className="gift-card-refined__cotas">
                    <div className="gift-card-refined__cotas-line">
                      <strong>Cotas disponíveis</strong>
                      <span>
                        {disponibilidade.restantes} de {disponibilidade.total}
                      </span>
                    </div>

                    <div className="gift-card-refined__cotas-bar">
                      <div
                        className="gift-card-refined__cotas-bar-fill"
                        style={{
                          width: `${
                            disponibilidade.total > 0
                              ? (disponibilidade.reservadas / disponibilidade.total) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                {disponibilidade.disponivel ? (
                  <div className="gift-card-refined__reservation">
                    <button
                      type="button"
                      className="event-button event-button--secondary gift-card-refined__toggle"
                      aria-expanded={expandedId === presente.id}
                      aria-controls={`gift-reservation-${presente.id}`}
                      onClick={() =>
                        setExpandedId((current) =>
                          current === presente.id ? null : presente.id,
                        )
                      }
                    >
                      {expandedId === presente.id
                        ? "Fechar reserva"
                        : presente.usa_cotas
                          ? "Quero reservar uma cota"
                          : "Quero reservar"}
                    </button>

                    {expandedId === presente.id ? (
                      <div
                        id={`gift-reservation-${presente.id}`}
                        className="gift-card-refined__form"
                      >
                        <label
                          className="gift-card-refined__form-label"
                          htmlFor={`gift-reserved-by-${presente.id}`}
                        >
                          Nome de quem está reservando
                        </label>

                        <input
                          id={`gift-reserved-by-${presente.id}`}
                          type="text"
                          className="gift-input"
                          placeholder="Digite seu nome"
                          value={nomesReserva[presente.id] || ""}
                          onChange={(event) =>
                            setNomesReserva((prev) => ({
                              ...prev,
                              [presente.id]: event.target.value,
                            }))
                          }
                          maxLength={120}
                          autoComplete="name"
                          disabled={loading}
                        />

                        <button
                          type="button"
                          className="event-button gift-card-refined__button"
                          onClick={() => reservarPresente(presente)}
                          disabled={loading}
                        >
                          {loading
                            ? "Reservando..."
                            : presente.usa_cotas
                              ? "Confirmar 1 cota"
                              : "Confirmar presente"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="gift-card-refined__unavailable" role="status">
                    Este presente já foi reservado.
                  </div>
                )}

                {feedback?.message ? (
                  <p
                    className={`gift-feedback ${
                      feedback.type === "error"
                        ? "form-feedback--error"
                        : "form-feedback--success"
                    }`}
                    role={feedback.type === "error" ? "alert" : "status"}
                    aria-live="polite"
                  >
                    {feedback.message}
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className="section-note-inline">
        <strong>Com carinho</strong>
        <p>
          Cada reserva representa uma lembrança especial desse momento que vamos
          construir juntos.
        </p>
      </div>
    </section>
  );
}
