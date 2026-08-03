"use client";

import Image from "next/image";
import { CheckCircle2, Gift, X } from "lucide-react";
import {
  type CSSProperties,
  type MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { formatPhoneBR, isValidPhoneBR } from "../../lib/utils/format-phone";
import type { Presente } from "../../types/presente";

type GiftsSectionProps = {
  eventoId: number;
  presentes: Presente[];
};

type FeedbackState = {
  type: "success" | "error" | "";
  message: string;
};

type ToastState = {
  message: string;
  giftName: string;
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
  const [selectedGift, setSelectedGift] = useState<Presente | null>(null);
  const [reservationName, setReservationName] = useState("");
  const [reservationPhone, setReservationPhone] = useState("");
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [modalFeedback, setModalFeedback] = useState<FeedbackState>({
    type: "",
    message: "",
  });
  const [toast, setToast] = useState<ToastState | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!selectedGift) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => nameInputRef.current?.focus(), 60);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && loadingId === null) {
        setSelectedGift(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [loadingId, selectedGift]);

  useEffect(() => {
    if (!toast) return;

    const timeoutId = window.setTimeout(() => setToast(null), 5200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  function openReservationModal(presente: Presente) {
    const savedContact = window.sessionStorage.getItem(
      `wedding-gift-contact:${eventoId}`,
    );

    if (savedContact) {
      try {
        const parsed = JSON.parse(savedContact) as {
          name?: string;
          phone?: string;
        };
        setReservationName(parsed.name || "");
        setReservationPhone(parsed.phone || "");
      } catch {
        setReservationName("");
        setReservationPhone("");
      }
    } else {
      setReservationName("");
      setReservationPhone("");
    }

    setModalFeedback({ type: "", message: "" });
    setSelectedGift(presente);
  }

  function closeReservationModal() {
    if (loadingId !== null) return;
    setSelectedGift(null);
    setModalFeedback({ type: "", message: "" });
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) closeReservationModal();
  }

  async function reservarPresente(presente: Presente) {
    const nomeReserva = reservationName.trim();
    const telefoneReserva = reservationPhone.trim();
    const disponibilidade = getDisponibilidade(presente);

    if (!nomeReserva) {
      setModalFeedback({
        type: "error",
        message: "Informe seu nome para confirmar a reserva.",
      });
      nameInputRef.current?.focus();
      return;
    }

    if (!isValidPhoneBR(telefoneReserva)) {
      setModalFeedback({
        type: "error",
        message: "Informe um telefone válido para relacionar a reserva à confirmação.",
      });
      return;
    }

    if (!disponibilidade.disponivel) {
      setModalFeedback({
        type: "error",
        message: "Este presente não está mais disponível.",
      });
      return;
    }

    try {
      setLoadingId(presente.id);
      setModalFeedback({ type: "", message: "" });

      const response = await fetch("/api/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          evento_id: eventoId,
          presente_id: presente.id,
          reservado_por: nomeReserva,
          telefone: telefoneReserva,
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

      window.sessionStorage.setItem(
        `wedding-gift-contact:${eventoId}`,
        JSON.stringify({ name: nomeReserva, phone: telefoneReserva }),
      );

      setSelectedGift(null);
      setModalFeedback({ type: "", message: "" });
      setToast({
        giftName: presente.nome,
        message: presente.usa_cotas
          ? "Sua cota foi reservada com sucesso."
          : "Seu presente foi reservado com sucesso.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível realizar a reserva.";

      setModalFeedback({ type: "error", message });
    } finally {
      setLoadingId(null);
    }
  }

  if (!presentesOrdenados.length) return null;

  const selectedAvailability = selectedGift
    ? getDisponibilidade(selectedGift)
    : null;
  const selectedValue = selectedGift ? formatCurrency(selectedGift.valor) : null;
  const selectedLoading = selectedGift ? loadingId === selectedGift.id : false;

  return (
    <section id="presentes" className="event-section gifts-section-refined">
      <div className="gifts-section-refined__header">
        <div className="gifts-section-refined__copy">
          <span className="section-badge">Presentes</span>
          <h2 className="section-title">Escolha um presente especial</h2>
          <p className="section-description">
            Selecionamos algumas opções com carinho. Toque em um presente disponível
            para revisar e confirmar sua reserva.
          </p>
        </div>
      </div>

      <div className="gift-grid-refined gift-grid-refined--enhanced">
        {presentesOrdenados.map((presente, index) => {
          const disponibilidade = getDisponibilidade(presente);
          const valorFormatado = formatCurrency(presente.valor);

          return (
            <article
              key={presente.id}
              data-reveal-item
              style={{ "--gift-reveal-index": Math.min(index, 5) } as CSSProperties}
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
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                    className="gift-card-refined__image"
                  />
                </div>
              ) : (
                <div className="gift-card-refined__image-wrap gift-card-refined__image-wrap--empty">
                  <Gift aria-hidden="true" size={30} />
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
                  <button
                    type="button"
                    className="event-button gift-card-refined__button"
                    onClick={() => openReservationModal(presente)}
                  >
                    {presente.usa_cotas ? "Reservar 1 cota" : "Reservar presente"}
                  </button>
                ) : (
                  <div className="gift-card-refined__unavailable" role="status">
                    Este presente já foi reservado.
                  </div>
                )}
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

      {selectedGift && selectedAvailability ? (
        <div
          className="gift-reservation-modal"
          role="presentation"
          onMouseDown={handleBackdropClick}
        >
          <div
            className="gift-reservation-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gift-reservation-modal-title"
            aria-describedby="gift-reservation-modal-description"
          >
            <div className="gift-reservation-modal__header">
              <div>
                <span className="gift-reservation-modal__eyebrow">
                  Confirmar reserva
                </span>
                <h3 id="gift-reservation-modal-title">
                  Revise seu presente
                </h3>
              </div>

              <button
                type="button"
                className="gift-reservation-modal__close"
                onClick={closeReservationModal}
                aria-label="Fechar confirmação da reserva"
                disabled={selectedLoading}
              >
                <X aria-hidden="true" size={22} />
              </button>
            </div>

            <div className="gift-reservation-modal__gift">
              <div className="gift-reservation-modal__thumb">
                {selectedGift.imagem_url ? (
                  <Image
                    src={selectedGift.imagem_url}
                    alt=""
                    fill
                    sizes="88px"
                    className="gift-reservation-modal__thumb-image"
                  />
                ) : (
                  <Gift aria-hidden="true" size={28} />
                )}
              </div>

              <div className="gift-reservation-modal__gift-copy">
                <strong>{selectedGift.nome}</strong>
                {selectedValue ? <span>{selectedValue}</span> : null}
                {selectedGift.usa_cotas ? (
                  <small>
                    Você reservará 1 cota. Restam {selectedAvailability.restantes}.
                  </small>
                ) : (
                  <small>A reserva deixará este presente indisponível para outras pessoas.</small>
                )}
              </div>
            </div>

            <p id="gift-reservation-modal-description" className="gift-reservation-modal__intro">
              Preencha seus dados para relacionarmos a reserva à sua confirmação de
              presença.
            </p>

            <div className="gift-reservation-modal__form">
              <label htmlFor="gift-reservation-name">Seu nome</label>
              <input
                ref={nameInputRef}
                id="gift-reservation-name"
                type="text"
                className="gift-input"
                placeholder="Digite seu nome completo"
                value={reservationName}
                onChange={(event) => setReservationName(event.target.value)}
                maxLength={120}
                autoComplete="name"
                disabled={selectedLoading}
              />

              <label htmlFor="gift-reservation-phone">Telefone para contato</label>
              <input
                id="gift-reservation-phone"
                type="tel"
                inputMode="tel"
                className="gift-input"
                placeholder="(00) 00000-0000"
                value={reservationPhone}
                onChange={(event) =>
                  setReservationPhone(formatPhoneBR(event.target.value))
                }
                maxLength={15}
                autoComplete="tel"
                disabled={selectedLoading}
                required
              />

              <p className="gift-reservation-modal__hint">
                O telefone será usado apenas para vincular a reserva ao RSVP e facilitar
                lembretes do casamento.
              </p>

              {modalFeedback.message ? (
                <p
                  className={`gift-reservation-modal__feedback ${
                    modalFeedback.type === "error"
                      ? "form-feedback--error"
                      : "form-feedback--success"
                  }`}
                  role={modalFeedback.type === "error" ? "alert" : "status"}
                  aria-live="polite"
                >
                  {modalFeedback.message}
                </p>
              ) : null}
            </div>

            <div className="gift-reservation-modal__actions">
              <button
                type="button"
                className="event-button event-button--secondary"
                onClick={closeReservationModal}
                disabled={selectedLoading}
              >
                Voltar
              </button>
              <button
                type="button"
                className="event-button"
                onClick={() => reservarPresente(selectedGift)}
                disabled={selectedLoading}
              >
                {selectedLoading
                  ? "Confirmando..."
                  : selectedGift.usa_cotas
                    ? "Confirmar cota"
                    : "Confirmar reserva"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="gift-reservation-toast" role="status" aria-live="polite">
          <span className="gift-reservation-toast__icon">
            <CheckCircle2 aria-hidden="true" size={24} />
          </span>
          <div className="gift-reservation-toast__copy">
            <strong>Reserva confirmada!</strong>
            <span>
              {toast.message} <b>{toast.giftName}</b>
            </span>
          </div>
          <button
            type="button"
            className="gift-reservation-toast__close"
            onClick={() => setToast(null)}
            aria-label="Fechar confirmação"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
      ) : null}
    </section>
  );
}
