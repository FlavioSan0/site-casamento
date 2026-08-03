"use client";

import { useMemo, useState } from "react";
import { formatCurrencyBR } from "../../lib/utils/format-currency";
import { buildWhatsAppUrl, isValidBrazilianPhone } from "../../lib/utils/whatsapp";
import type { ReservaPresente } from "../../types/reserva";
import { AdminBadge } from "./ui/admin-badge";
import { AdminButton } from "./ui/admin-button";
import { AdminCard, AdminCardHeader } from "./ui/admin-card";

type ReservasTableProps = {
  eventoId: number;
  slug: string;
  chavePix: string | null;
  reservas: ReservaPresente[];
};

type ReservationFilter =
  | "all"
  | "linked"
  | "pending"
  | "delivery-pending"
  | "received";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

async function parseJsonResponse(response: Response) {
  const rawText = await response.text();
  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error(`Resposta inválida do servidor: ${rawText.slice(0, 180)}`);
  }
}

export function ReservasTable({
  eventoId,
  slug,
  chavePix,
  reservas,
}: ReservasTableProps) {
  const [items, setItems] = useState(reservas);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReservationFilter>("all");
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [updatingReceiptId, setUpdatingReceiptId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "">("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items.filter((item) => {
      if (status === "linked" && !item.confirmacao_id) return false;
      if (status === "pending" && item.confirmacao_id) return false;
      if (status === "delivery-pending" && item.presente_recebido) return false;
      if (status === "received" && !item.presente_recebido) return false;
      if (!term) return true;

      return [item.reservado_por, item.telefone, item.presentes?.nome]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [items, search, status]);

  const uniquePeople = useMemo(
    () =>
      new Set(
        items.map((item) =>
          (item.telefone_normalizado || item.reservado_por).trim().toLowerCase(),
        ),
      ).size,
    [items],
  );

  const receivedCount = useMemo(
    () => items.filter((item) => item.presente_recebido).length,
    [items],
  );

  function openReminder(item: ReservaPresente) {
    const phone = item.telefone || item.telefone_normalizado;
    const giftName = item.presentes?.nome || "um presente";
    const giftValue = formatCurrencyBR(item.presentes?.valor);
    const pixBlock = chavePix?.trim()
      ? `\n\nPara concluir o presente, você pode realizar o envio pela chave PIX:\n${chavePix.trim()}`
      : "";
    const message = item.presente_recebido
      ? `Olá, ${item.reservado_por}! Tudo bem?\n\nRecebemos o presente “${giftName}”, no valor de ${giftValue}.\n\nMuito obrigado pelo carinho e por fazer parte desse momento tão especial conosco!`
      : item.confirmacao_id
        ? `Olá, ${item.reservado_por}! Tudo bem?\n\nVimos que você reservou “${giftName}”, no valor de ${giftValue}, em nosso convite digital.${pixBlock}\n\nEstamos enviando apenas um lembrete carinhoso sobre a reserva. Caso já tenha realizado o envio, pode desconsiderar.\n\nMuito obrigado por fazer parte desse momento conosco!`
        : `Olá, ${item.reservado_por}! Tudo bem?\n\nVimos que você reservou “${giftName}”, no valor de ${giftValue}, em nosso convite, mas ainda não localizamos sua confirmação de presença.\n\nVocê pode confirmar por aqui:\n${window.location.origin}/evento/${slug}\n\nEsperamos muito celebrar esse momento com você!`;
    const url = buildWhatsAppUrl(phone, message);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function updateReceiptStatus(item: ReservaPresente, received: boolean) {
    try {
      setUpdatingReceiptId(item.id);
      setFeedback("");
      setFeedbackType("");

      const response = await fetch("/api/admin/reservas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          evento_id: eventoId,
          presente_recebido: received,
        }),
      });
      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          result?.error || "Não foi possível atualizar a entrega do presente.",
        );
      }

      setItems((current) =>
        current.map((reservation) =>
          reservation.id === item.id
            ? {
                ...reservation,
                presente_recebido: Boolean(result.data?.presente_recebido),
                presente_recebido_em:
                  result.data?.presente_recebido_em || null,
              }
            : reservation,
        ),
      );
      setFeedback(result?.message || "Situação do presente atualizada.");
      setFeedbackType("success");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a entrega do presente.",
      );
      setFeedbackType("error");
    } finally {
      setUpdatingReceiptId(null);
    }
  }

  async function removeReservation(item: ReservaPresente) {
    const confirmed = window.confirm(
      `Remover a reserva de ${item.reservado_por} para “${item.presentes?.nome || "presente"}”?`,
    );
    if (!confirmed) return;

    try {
      setLoadingId(item.id);
      setFeedback("");
      setFeedbackType("");

      const response = await fetch(
        `/api/admin/reservas?id=${item.id}&evento_id=${eventoId}`,
        { method: "DELETE" },
      );
      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível remover a reserva.");
      }

      setItems((current) =>
        current.filter((reservation) => reservation.id !== item.id),
      );
      setFeedback(result?.message || "Reserva removida com sucesso.");
      setFeedbackType("success");
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Não foi possível remover.",
      );
      setFeedbackType("error");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <AdminCard>
      <AdminCardHeader
        title="Reservas registradas"
        description="Consulte contato, valor, vínculo com RSVP, entrega e envie lembretes pelo WhatsApp."
        rightSlot={<AdminBadge variant="neutral">{items.length} reserva(s)</AdminBadge>}
      />

      <div className="admin-reservation-stats">
        <div>
          <span>Total de reservas</span>
          <strong>{items.length}</strong>
        </div>
        <div>
          <span>Pessoas identificadas</span>
          <strong>{uniquePeople}</strong>
        </div>
        <div>
          <span>Presentes recebidos</span>
          <strong>{receivedCount}</strong>
        </div>
        <div>
          <span>Envio pendente</span>
          <strong>{items.length - receivedCount}</strong>
        </div>
      </div>

      <div className="admin-reservations-toolbar admin-reservations-toolbar--enhanced">
        <div>
          <label htmlFor="reservation-search">Buscar reserva</label>
          <input
            id="reservation-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome, telefone ou presente"
          />
        </div>
        <div>
          <label htmlFor="reservation-status">Situação</label>
          <select
            id="reservation-status"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as ReservationFilter)
            }
          >
            <option value="all">Todas</option>
            <option value="linked">Com confirmação</option>
            <option value="pending">Sem confirmação</option>
            <option value="delivery-pending">Envio pendente</option>
            <option value="received">Presente recebido</option>
          </select>
        </div>
      </div>

      {feedback ? (
        <p className={`form-feedback form-feedback--${feedbackType}`}>{feedback}</p>
      ) : null}

      {filtered.length ? (
        <div className="admin-reservations-list admin-reservations-list--cards">
          {filtered.map((item) => {
            const phone = item.telefone || item.telefone_normalizado || "";
            return (
              <article key={item.id} className="admin-reservation-row admin-reservation-card">
                <div className="admin-reservation-row__main">
                  <div className="admin-reservation-card__badges">
                    <AdminBadge variant={item.confirmacao_id ? "success" : "warning"}>
                      {item.confirmacao_id
                        ? item.vinculo_origem === "nome"
                          ? "Ligada pelo nome"
                          : item.vinculo_origem === "telefone"
                            ? "Ligada pelo telefone"
                            : "Ligada ao RSVP"
                        : "Confirmação pendente"}
                    </AdminBadge>
                    <AdminBadge variant="neutral">
                      {item.presentes?.usa_cotas ? "Cota" : "Presente"}
                    </AdminBadge>
                    <AdminBadge variant={item.presente_recebido ? "success" : "warning"}>
                      {item.presente_recebido ? "Presente recebido" : "Envio pendente"}
                    </AdminBadge>
                  </div>
                  <span className="admin-reservation-row__gift">
                    {item.presentes?.nome || `Presente #${item.presente_id}`}
                  </span>
                  <span className="admin-reservation-value">
                    {formatCurrencyBR(item.presentes?.valor)}
                  </span>
                  <strong>{item.reservado_por}</strong>
                  <p>{phone || "Telefone não informado"}</p>
                  <small>Reservado em {formatDate(item.created_at)}</small>
                  {item.presente_recebido_em ? (
                    <small>Recebido em {formatDate(item.presente_recebido_em)}</small>
                  ) : null}
                </div>

                <div className="admin-reservation-card__actions">
                  <AdminButton
                    type="button"
                    variant={item.presente_recebido ? "ghost" : "secondary"}
                    onClick={() => void updateReceiptStatus(item, !item.presente_recebido)}
                    disabled={updatingReceiptId === item.id}
                  >
                    {updatingReceiptId === item.id
                      ? "Atualizando..."
                      : item.presente_recebido
                        ? "Desfazer baixa"
                        : "Dar baixa"}
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="primary"
                    onClick={() => openReminder(item)}
                    disabled={!isValidBrazilianPhone(phone)}
                  >
                    {isValidBrazilianPhone(phone)
                      ? item.presente_recebido
                        ? "Enviar agradecimento"
                        : "Enviar lembrete"
                      : "Telefone inválido"}
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="danger"
                    onClick={() => removeReservation(item)}
                    disabled={loadingId === item.id}
                  >
                    {loadingId === item.id ? "Removendo..." : "Remover reserva"}
                  </AdminButton>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="admin-empty-state">
          <strong>Nenhuma reserva encontrada.</strong>
          <p>Ajuste os filtros ou aguarde novas reservas.</p>
        </div>
      )}
    </AdminCard>
  );
}
