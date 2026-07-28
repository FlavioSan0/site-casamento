"use client";

import { useMemo, useState } from "react";
import { AdminBadge } from "./ui/admin-badge";
import { AdminButton } from "./ui/admin-button";
import { AdminCard, AdminCardHeader } from "./ui/admin-card";
import type { ReservaPresente } from "../../types/reserva";

type ReservasTableProps = {
  eventoId: number;
  reservas: ReservaPresente[];
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function ReservasTable({ eventoId, reservas }: ReservasTableProps) {
  const [items, setItems] = useState(reservas);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "">("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;

    return items.filter((item) =>
      [item.reservado_por, item.presentes?.nome]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [items, search]);

  const uniquePeople = useMemo(
    () => new Set(items.map((item) => item.reservado_por.trim().toLowerCase())).size,
    [items],
  );

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
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível remover a reserva.");
      }

      setItems((current) => current.filter((reservation) => reservation.id !== item.id));
      setFeedback(result?.message || "Reserva removida com sucesso.");
      setFeedbackType("success");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível remover.");
      setFeedbackType("error");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <AdminCard>
      <AdminCardHeader
        title="Reservas registradas"
        description="Consulte quem escolheu cada presente e restaure a disponibilidade quando necessário."
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
      </div>

      <div className="admin-reservations-toolbar">
        <label htmlFor="reservation-search">Buscar reserva</label>
        <input
          id="reservation-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nome da pessoa ou do presente"
        />
      </div>

      {feedback ? (
        <p className={`form-feedback form-feedback--${feedbackType}`}>{feedback}</p>
      ) : null}

      {filtered.length ? (
        <div className="admin-reservations-list">
          {filtered.map((item) => (
            <article key={item.id} className="admin-reservation-row">
              <div className="admin-reservation-row__main">
                <span className="admin-reservation-row__gift">
                  {item.presentes?.nome || `Presente #${item.presente_id}`}
                </span>
                <strong>{item.reservado_por}</strong>
                <small>{formatDate(item.created_at)}</small>
              </div>

              <AdminButton
                type="button"
                variant="danger"
                onClick={() => removeReservation(item)}
                disabled={loadingId === item.id}
              >
                {loadingId === item.id ? "Removendo..." : "Remover reserva"}
              </AdminButton>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-empty-state">
          <strong>Nenhuma reserva encontrada.</strong>
          <p>As novas reservas aparecerão aqui automaticamente.</p>
        </div>
      )}
    </AdminCard>
  );
}
