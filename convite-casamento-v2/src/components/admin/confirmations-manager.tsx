"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReservaPresente } from "../../types/reserva";
import {
  MESSAGE_TEMPLATES,
  buildWhatsAppUrl,
  fillMessageTemplate,
  getMessageTemplate,
  isValidBrazilianPhone,
  normalizePhoneDigits,
  type MessageTemplateKey,
} from "../../lib/utils/whatsapp";
import { formatPhoneBR } from "../../lib/utils/format-phone";
import { formatCurrencyBR } from "../../lib/utils/format-currency";
import { findUniqueConfirmationByName } from "../../lib/utils/normalize-person-name";
import { AdminSectionHeader } from "./admin-section-header";
import { AdminBadge } from "./ui/admin-badge";
import { AdminButton } from "./ui/admin-button";
import { AdminCard, AdminCardHeader } from "./ui/admin-card";
import { AdminField } from "./ui/admin-field";
import { useAdminModal } from "./use-admin-modal";

type Confirmacao = {
  id: number;
  evento_id: number;
  nome: string;
  nome_normalizado?: string | null;
  telefone: string | null;
  telefone_normalizado?: string | null;
  acompanhantes: number;
  nomes_acompanhantes: string[] | null;
  presenca: string;
  observacoes: string | null;
  created_at?: string;
};

type EventCommunicationData = {
  slug: string;
  nome_casal: string;
  data_evento: string | null;
  horario_evento: string | null;
  local_cerimonia: string | null;
  link_maps_cerimonia: string | null;
  local_recepcao: string | null;
  link_maps_recepcao: string | null;
  chave_pix: string | null;
};

type ConfirmationsManagerProps = {
  eventoId: number;
  confirmacoes: Confirmacao[];
  reservas: ReservaPresente[];
  evento: EventCommunicationData;
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

type MessageTarget = {
  nome: string;
  telefone: string;
  confirmacao: Confirmacao | null;
  reservas: ReservaPresente[];
};

type FilterKey =
  | "all"
  | "confirmed"
  | "with-reservation"
  | "without-reservation"
  | "gift-pending"
  | "gift-received"
  | "orphan-reservations";

const initialForm: ConfirmationFormState = {
  id: null,
  nome: "",
  telefone: "",
  acompanhantes: "0",
  nomes_acompanhantes: [],
  presenca: "",
  observacoes: "",
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
}

function formatEventDate(value: string | null) {
  if (!value) return "data a confirmar";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "data a confirmar";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function acompanhantesToArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function isConfirmed(value: string) {
  return value === "sim" || /sim|presente/i.test(value);
}

function reservationPhone(item: ReservaPresente) {
  return item.telefone || item.telefone_normalizado || "";
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
  reservas,
  evento,
  maxAcompanhantes = 4,
}: ConfirmationsManagerProps) {
  const [confirmationList, setConfirmationList] = useState<Confirmacao[]>(confirmacoes);
  const [reservationList, setReservationList] = useState<ReservaPresente[]>(reservas);
  const [form, setForm] = useState<ConfirmationFormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "">("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [messageTarget, setMessageTarget] = useState<MessageTarget | null>(null);
  const [messageTemplateKey, setMessageTemplateKey] =
    useState<MessageTemplateKey>("confirmation_reminder");
  const [messageText, setMessageText] = useState("");
  const [messagePhotoFile, setMessagePhotoFile] = useState<File | null>(null);
  const [messagePhotoPreviewUrl, setMessagePhotoPreviewUrl] = useState("");
  const [sharingPhoto, setSharingPhoto] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState("");
  const [manualLinkSelections, setManualLinkSelections] = useState<Record<number, string>>({});
  const [linkingReservationId, setLinkingReservationId] = useState<number | null>(null);
  const [updatingReceiptId, setUpdatingReceiptId] = useState<number | null>(null);
  const modalTriggerRef = useRef<HTMLButtonElement | null>(null);

  const reservationsByConfirmation = useMemo(() => {
    const map = new Map<number, ReservaPresente[]>();

    reservationList.forEach((reservation) => {
      const directId = Number(reservation.confirmacao_id || 0);
      let confirmationId = directId;

      if (!confirmationId) {
        const phone = normalizePhoneDigits(reservationPhone(reservation));
        const matchedByPhone = confirmationList.find(
          (confirmation) =>
            phone &&
            normalizePhoneDigits(
              confirmation.telefone_normalizado || confirmation.telefone,
            ) === phone,
        );
        confirmationId = Number(matchedByPhone?.id || 0);
      }

      if (!confirmationId) {
        const matchedByName = findUniqueConfirmationByName(
          reservation.reservado_por,
          confirmationList,
        );
        confirmationId = Number(matchedByName?.id || 0);
      }

      if (!confirmationId) return;
      map.set(confirmationId, [...(map.get(confirmationId) || []), reservation]);
    });

    return map;
  }, [confirmationList, reservationList]);

  const orphanReservations = useMemo(
    () =>
      reservationList.filter((reservation) => {
        if (reservation.confirmacao_id) return false;
        const phone = normalizePhoneDigits(reservationPhone(reservation));
        const matchedByPhone = confirmationList.some(
          (confirmation) =>
            phone &&
            normalizePhoneDigits(
              confirmation.telefone_normalizado || confirmation.telefone,
            ) === phone,
        );
        if (matchedByPhone) return false;

        return !findUniqueConfirmationByName(
          reservation.reservado_por,
          confirmationList,
        );
      }),
    [confirmationList, reservationList],
  );

  const sortedConfirmations = useMemo(() => {
    const ordered = [...confirmationList].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    const normalizedSearch = search.trim().toLowerCase();

    return ordered.filter((item) => {
      const linkedReservations = reservationsByConfirmation.get(item.id) || [];
      const hasReservations = linkedReservations.length > 0;

      if (filter === "confirmed" && !isConfirmed(item.presenca)) return false;
      if (filter === "with-reservation" && !hasReservations) return false;
      if (filter === "without-reservation" && hasReservations) return false;
      if (
        filter === "gift-pending" &&
        !linkedReservations.some((reservation) => !reservation.presente_recebido)
      ) {
        return false;
      }
      if (
        filter === "gift-received" &&
        !linkedReservations.some((reservation) => reservation.presente_recebido)
      ) {
        return false;
      }
      if (filter === "orphan-reservations") return false;

      if (!normalizedSearch) return true;

      const haystack = [
        item.nome,
        item.telefone,
        item.presenca,
        ...acompanhantesToArray(item.nomes_acompanhantes),
        item.observacoes,
        ...linkedReservations.map((reservation) => reservation.presentes?.nome || ""),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [confirmationList, filter, reservationsByConfirmation, search]);

  const visibleOrphans = useMemo(() => {
    if (
      filter !== "all" &&
      filter !== "orphan-reservations" &&
      filter !== "gift-pending" &&
      filter !== "gift-received"
    ) {
      return [];
    }

    return orphanReservations.filter((item) => {
      if (filter === "gift-pending" && item.presente_recebido) return false;
      if (filter === "gift-received" && !item.presente_recebido) return false;

      const term = search.trim().toLowerCase();
      if (!term) return true;
      return [item.reservado_por, item.telefone, item.presentes?.nome]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [filter, orphanReservations, search]);

  const stats = useMemo(() => {
    const total = confirmationList.length;
    const confirmados = confirmationList.filter((item) => isConfirmed(item.presenca)).length;
    const acompanhantes = confirmationList.reduce(
      (acc, item) => acc + Number(item.acompanhantes || 0),
      0,
    );
    const totalConvidados = confirmationList.reduce(
      (acc, item) => acc + 1 + Number(item.acompanhantes || 0),
      0,
    );
    const totalPessoasConfirmadas = confirmationList.reduce(
      (acc, item) =>
        isConfirmed(item.presenca)
          ? acc + 1 + Number(item.acompanhantes || 0)
          : acc,
      0,
    );
    const linkedReservations = reservationList.length - orphanReservations.length;
    const receivedReservations = reservationList.filter(
      (item) => item.presente_recebido,
    ).length;

    return {
      total,
      confirmados,
      acompanhantes,
      totalConvidados,
      totalPessoasConfirmadas,
      reservations: reservationList.length,
      linkedReservations,
      receivedReservations,
      orphanReservations: orphanReservations.length,
    };
  }, [confirmationList, orphanReservations.length, reservationList]);

  const resetForm = useCallback(() => {
    setForm(initialForm);
    setFeedback("");
    setFeedbackType("");
  }, []);

  const closeEditModal = useCallback(() => {
    if (loading) return;
    setIsEditModalOpen(false);
    resetForm();
  }, [loading, resetForm]);

  const closeMessageModal = useCallback(() => {
    if (sharingPhoto) return;
    setIsMessageModalOpen(false);
    setMessageTarget(null);
    setMessageText("");
    setMessagePhotoFile(null);
    setMessagePhotoPreviewUrl("");
    setMessageFeedback("");
  }, [sharingPhoto]);

  useAdminModal(
    isEditModalOpen,
    closeEditModal,
    loading,
    modalTriggerRef,
  );
  useAdminModal(
    isMessageModalOpen,
    closeMessageModal,
    sharingPhoto,
    modalTriggerRef,
  );

  useEffect(() => {
    return () => {
      if (messagePhotoPreviewUrl) {
        URL.revokeObjectURL(messagePhotoPreviewUrl);
      }
    };
  }, [messagePhotoPreviewUrl]);

  function getReservationsForTemplate(
    target: MessageTarget,
    key: MessageTemplateKey,
  ) {
    const received = target.reservas.filter(
      (reservation) => reservation.presente_recebido,
    );
    const pending = target.reservas.filter(
      (reservation) => !reservation.presente_recebido,
    );

    if (key === "gift_received_thanks") {
      return received.length ? received : target.reservas;
    }

    if (key === "gift_reminder" || key === "gift_without_confirmation") {
      return pending.length ? pending : target.reservas;
    }

    return target.reservas;
  }

  function getTemplateValues(target: MessageTarget, key: MessageTemplateKey) {
    const selectedReservations = getReservationsForTemplate(target, key);
    const gifts = selectedReservations
      .map((reservation) => reservation.presentes?.nome)
      .filter(Boolean)
      .join(", ");
    const values = selectedReservations.map((reservation) =>
      formatCurrencyBR(reservation.presentes?.valor),
    );
    const resumoPresentes = selectedReservations.length
      ? selectedReservations
          .map((reservation) => {
            const nome =
              reservation.presentes?.nome ||
              `Presente #${reservation.presente_id}`;
            return `• ${nome} — ${formatCurrencyBR(reservation.presentes?.valor)}`;
          })
          .join("\n")
      : "• Presente reservado — Valor não informado";
    const chavePix = evento.chave_pix?.trim() || "";
    const pixReserva = chavePix
      ? `Para concluir o presente, você pode realizar o envio pela chave PIX:\n${chavePix}`
      : "";

    return {
      nome: target.nome,
      data: formatEventDate(evento.data_evento),
      hora: evento.horario_evento || "horário a confirmar",
      presente: gifts || "o presente reservado",
      valor_presente: values.join(", ") || "Valor não informado",
      resumo_presentes: resumoPresentes,
      quantidade_pessoas: String(
        1 + Number(target.confirmacao?.acompanhantes || 0),
      ),
      local_cerimonia: evento.local_cerimonia || "local a confirmar",
      local_recepcao: evento.local_recepcao || "local a confirmar",
      link_cerimonia: evento.link_maps_cerimonia || "",
      link_recepcao: evento.link_maps_recepcao || "",
      link_convite: `${window.location.origin}/evento/${evento.slug}`,
      chave_pix: chavePix,
      pix_reserva: pixReserva,
    };
  }

  function buildMessage(target: MessageTarget, key: MessageTemplateKey) {
    return fillMessageTemplate(
      getMessageTemplate(key).template,
      getTemplateValues(target, key),
    )
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function openMessageComposer(target: MessageTarget) {
    if (!isValidBrazilianPhone(target.telefone)) {
      setFeedback("Este cadastro não possui um telefone válido para WhatsApp.");
      setFeedbackType("error");
      return;
    }

    const allGiftsReceived =
      target.reservas.length > 0 &&
      target.reservas.every((reservation) => reservation.presente_recebido);
    const defaultKey: MessageTemplateKey = allGiftsReceived
      ? "gift_received_thanks"
      : target.reservas.length > 0 && !target.confirmacao
        ? "gift_without_confirmation"
        : target.reservas.length > 0
          ? "gift_reminder"
          : target.confirmacao && isConfirmed(target.confirmacao.presenca)
            ? "confirmation_received"
            : "confirmation_reminder";

    setMessageTarget(target);
    setMessageTemplateKey(defaultKey);
    setMessageText(buildMessage(target, defaultKey));
    setMessagePhotoFile(null);
    setMessagePhotoPreviewUrl("");
    setMessageFeedback("");
    setIsMessageModalOpen(true);
  }

  function handleTemplateChange(key: MessageTemplateKey) {
    setMessageTemplateKey(key);
    if (messageTarget) setMessageText(buildMessage(messageTarget, key));
  }

  function handleMessagePhotoSelect(file: File) {
    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);

    if (!allowedTypes.has(file.type)) {
      setMessageFeedback("Formato inválido. Use JPG, PNG, WEBP ou GIF.");
      return;
    }

    if (file.size <= 0 || file.size > 20 * 1024 * 1024) {
      setMessageFeedback("A foto deve ter no máximo 20 MB.");
      return;
    }

    setMessagePhotoFile(file);
    setMessagePhotoPreviewUrl(URL.createObjectURL(file));
    setMessageFeedback("Foto pronta para ser enviada como arquivo junto da mensagem.");
  }

  function removeMessagePhoto() {
    setMessagePhotoFile(null);
    setMessagePhotoPreviewUrl("");
    setMessageFeedback("");
  }

  function openWhatsApp() {
    if (!messageTarget) return;
    const url = buildWhatsAppUrl(messageTarget.telefone, messageText.trim());
    if (!url) {
      setMessageFeedback("Telefone inválido para abrir o WhatsApp.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(messageText.trim());
    setMessageFeedback("Mensagem copiada.");
  }

  function downloadMessagePhoto() {
    if (!messagePhotoFile || !messagePhotoPreviewUrl) return;

    const anchor = document.createElement("a");
    anchor.href = messagePhotoPreviewUrl;
    anchor.download = messagePhotoFile.name || "lembranca-casamento.jpg";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setMessageFeedback("Foto baixada. Agora você pode anexá-la manualmente no WhatsApp.");
  }

  async function shareWithPhoto() {
    if (!messagePhotoFile) {
      openWhatsApp();
      return;
    }

    setSharingPhoto(true);
    setMessageFeedback("");

    try {
      const fileShareData = { files: [messagePhotoFile] };
      const supportsFileShare =
        Boolean(navigator.share) &&
        Boolean(navigator.canShare) &&
        navigator.canShare(fileShareData);

      if (!supportsFileShare) {
        downloadMessagePhoto();
        openWhatsApp();
        setMessageFeedback(
          "Este navegador não permite anexar a foto automaticamente. A foto foi baixada e o WhatsApp foi aberto; anexe o arquivo manualmente.",
        );
        return;
      }

      await navigator.share({
        title: `Mensagem para ${messageTarget?.nome || "convidado"}`,
        text: messageText.trim(),
        files: [messagePhotoFile],
      });

      setMessageFeedback("Foto e mensagem enviadas para o compartilhamento do dispositivo.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setMessageFeedback("Compartilhamento cancelado.");
        return;
      }

      setMessageFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível compartilhar a foto diretamente.",
      );
    } finally {
      setSharingPhoto(false);
    }
  }

  async function handlePrimaryMessageAction() {
    if (messagePhotoFile) {
      await shareWithPhoto();
      return;
    }

    openWhatsApp();
  }

  function handleChange<K extends keyof ConfirmationFormState>(
    field: K,
    value: ConfirmationFormState[K],
  ) {
    if (field === "telefone" && typeof value === "string") {
      setForm((prev) => ({ ...prev, telefone: formatPhoneBR(value) }));
      return;
    }

    if (field === "acompanhantes" && typeof value === "string") {
      let total = Number(value || 0);
      if (Number.isNaN(total) || total < 0) total = 0;
      if (total > maxAcompanhantes) total = maxAcompanhantes;

      setForm((prev) => {
        const nextNames = [...prev.nomes_acompanhantes];
        while (nextNames.length < total) nextNames.push("");
        if (nextNames.length > total) nextNames.length = total;
        return {
          ...prev,
          acompanhantes: String(total),
          nomes_acompanhantes: nextNames,
        };
      });
      return;
    }

    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleAcompanhanteChange(index: number, value: string) {
    setForm((prev) => {
      const next = [...prev.nomes_acompanhantes];
      next[index] = value;
      return { ...prev, nomes_acompanhantes: next };
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
    setIsEditModalOpen(true);
  }


  async function handleReceiptStatus(
    reservation: ReservaPresente,
    received: boolean,
  ) {
    try {
      setUpdatingReceiptId(reservation.id);
      setFeedback("");
      setFeedbackType("");

      const response = await fetch("/api/admin/reservas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reservation.id,
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

      setReservationList((prev) =>
        prev.map((item) =>
          item.id === reservation.id
            ? {
                ...item,
                presente_recebido: Boolean(result.data?.presente_recebido),
                presente_recebido_em:
                  result.data?.presente_recebido_em || null,
              }
            : item,
        ),
      );
      setFeedback(
        result?.message ||
          (received
            ? "Presente marcado como recebido."
            : "Baixa do presente desfeita."),
      );
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

  async function handleManualLink(reservation: ReservaPresente) {
    const confirmationId = Number(manualLinkSelections[reservation.id] || 0);

    if (!confirmationId) {
      setFeedback("Selecione a confirmação que corresponde a esta reserva.");
      setFeedbackType("error");
      return;
    }

    try {
      setLinkingReservationId(reservation.id);
      setFeedback("");
      setFeedbackType("");

      const response = await fetch("/api/admin/reservas/relacionar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evento_id: eventoId,
          reserva_id: reservation.id,
          confirmacao_id: confirmationId,
        }),
      });
      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível relacionar a reserva.");
      }

      setReservationList((prev) =>
        prev.map((item) =>
          item.id === reservation.id
            ? {
                ...item,
                confirmacao_id: confirmationId,
                vinculo_origem: "manual",
              }
            : item,
        ),
      );
      setManualLinkSelections((prev) => {
        const next = { ...prev };
        delete next[reservation.id];
        return next;
      });
      setFeedback("Reserva relacionada manualmente com sucesso.");
      setFeedbackType("success");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível relacionar a reserva.",
      );
      setFeedbackType("error");
    } finally {
      setLinkingReservationId(null);
    }
  }

  async function handleDelete(confirmacao: Confirmacao) {
    const confirmed = window.confirm(
      `Deseja excluir a confirmação de "${confirmacao.nome}"? As reservas relacionadas serão preservadas.`,
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/confirmacoes?id=${confirmacao.id}&evento_id=${eventoId}`,
        { method: "DELETE" },
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
      setFeedback(error instanceof Error ? error.message : "Não foi possível excluir.");
      setFeedbackType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.id || !form.nome.trim() || !form.presenca.trim()) {
      setFeedback("Revise nome e presença.");
      setFeedbackType("error");
      return;
    }

    const acompanhantes = Number(form.acompanhantes || 0);
    const nomesAcompanhantes = form.nomes_acompanhantes
      .map((item) => item.trim())
      .filter(Boolean);

    if (
      Number.isNaN(acompanhantes) ||
      acompanhantes < 0 ||
      acompanhantes > maxAcompanhantes ||
      (acompanhantes > 0 && nomesAcompanhantes.length !== acompanhantes)
    ) {
      setFeedback("Revise a quantidade e os nomes dos acompanhantes.");
      setFeedbackType("error");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/admin/confirmacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        prev.map((item) => (Number(item.id) === Number(updated.id) ? updated : item)),
      );
      setIsEditModalOpen(false);
      resetForm();
      setFeedback("Confirmação atualizada com sucesso.");
      setFeedbackType("success");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível salvar.");
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
          title="Confirmações, reservas e mensagens"
          description="Veja presença e presentes no mesmo cadastro e prepare lembretes personalizados para WhatsApp."
        />

        <div className="admin-overview-metrics admin-guest-metrics">
          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Confirmações</span>
            <strong className="admin-metric-value">{stats.total}</strong>
            <p className="admin-metric-text">Respostas registradas no RSVP.</p>
          </AdminCard>
          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Pessoas confirmadas</span>
            <strong className="admin-metric-value">{stats.totalPessoasConfirmadas}</strong>
            <p className="admin-metric-text">
              Convidados principais e acompanhantes informados.
            </p>
          </AdminCard>
          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Reservas</span>
            <strong className="admin-metric-value">{stats.reservations}</strong>
            <p className="admin-metric-text">
              {stats.linkedReservations} relacionada(s) • {stats.receivedReservations} recebida(s).
            </p>
          </AdminCard>
          <AdminCard className="admin-metric-card">
            <span className="admin-metric-label">Reservas pendentes</span>
            <strong className="admin-metric-value">{stats.orphanReservations}</strong>
            <p className="admin-metric-text">Ainda sem confirmação relacionada.</p>
          </AdminCard>
        </div>
      </section>

      <AdminCard>
        <AdminCardHeader
          title="Convidados e reservas"
          description={`Busque por nome, telefone, acompanhante ou presente. Limite atual: ${maxAcompanhantes} acompanhante(s).`}
        />

        <div className="admin-guest-toolbar">
          <div className="admin-guest-filters" role="group" aria-label="Filtros de convidados">
            {([
              ["all", "Todos"],
              ["confirmed", "Confirmados"],
              ["with-reservation", "Com reserva"],
              ["without-reservation", "Sem reserva"],
              ["gift-pending", "Presente pendente"],
              ["gift-received", "Presente recebido"],
              ["orphan-reservations", "Reserva sem confirmação"],
            ] as Array<[FilterKey, string]>).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`admin-guest-filter ${filter === key ? "admin-guest-filter--active" : ""}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            type="search"
            className="admin-guest-search"
            placeholder="Buscar convidado, telefone ou presente..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {feedback ? (
          <p className={`form-feedback form-feedback--${feedbackType}`}>{feedback}</p>
        ) : null}

        {sortedConfirmations.length === 0 && visibleOrphans.length === 0 ? (
          <div className="admin-empty-state">
            <strong>Nenhum cadastro encontrado</strong>
            <p>Ajuste os filtros ou aguarde novas confirmações e reservas.</p>
          </div>
        ) : (
          <div className="admin-confirmation-grid-refined admin-guest-grid">
            {sortedConfirmations.map((confirmacao) => {
              const linkedReservations = reservationsByConfirmation.get(confirmacao.id) || [];
              const acompanhantesNomes = acompanhantesToArray(
                confirmacao.nomes_acompanhantes,
              );
              const confirmed = isConfirmed(confirmacao.presenca);
              const phoneValid = isValidBrazilianPhone(confirmacao.telefone);

              return (
                <AdminCard key={confirmacao.id} className="admin-confirmation-card-refined admin-guest-card">
                  <div className="admin-confirmation-card-refined__top">
                    <div className="admin-confirmation-card-refined__info">
                      <div className="admin-confirmation-card-refined__badges">
                        <AdminBadge variant={confirmed ? "success" : "danger"}>
                          {confirmed ? "Presença confirmada" : confirmacao.presenca}
                        </AdminBadge>
                        <AdminBadge variant={linkedReservations.length ? "success" : "neutral"}>
                          {linkedReservations.length} reserva(s)
                        </AdminBadge>
                      </div>
                      <h3 className="admin-confirmation-card-refined__title">{confirmacao.nome}</h3>
                      <p className="admin-confirmation-card-refined__subtitle">
                        {confirmacao.telefone || "Telefone não informado"}
                      </p>
                    </div>
                    <div className="admin-confirmation-card-refined__meta">
                      <span>Recebido em</span>
                      <strong>{formatDate(confirmacao.created_at)}</strong>
                    </div>
                  </div>

                  <div className="admin-guest-summary-grid">
                    <div className="admin-confirmation-block">
                      <strong>Pessoas</strong>
                      <p>{1 + Number(confirmacao.acompanhantes || 0)} pessoa(s)</p>
                      {acompanhantesNomes.length ? <small>{acompanhantesNomes.join(", ")}</small> : null}
                    </div>
                    <div className="admin-confirmation-block">
                      <strong>Presentes reservados</strong>
                      {linkedReservations.length ? (
                        <ul className="admin-guest-gifts-list">
                          {linkedReservations.map((reservation) => (
                            <li key={reservation.id} className="admin-guest-gift-item">
                              <div className="admin-guest-gift-item__info">
                                <span>
                                  {reservation.presentes?.nome ||
                                    `Presente #${reservation.presente_id}`}
                                </span>
                                <strong>
                                  {formatCurrencyBR(reservation.presentes?.valor)}
                                </strong>
                                {reservation.vinculo_origem === "nome" ? (
                                  <small>Relacionada pelo nome</small>
                                ) : reservation.vinculo_origem === "telefone" ? (
                                  <small>Relacionada pelo telefone</small>
                                ) : reservation.vinculo_origem === "manual" ? (
                                  <small>Relacionada manualmente</small>
                                ) : (
                                  <small>Correspondência sugerida pelo nome</small>
                                )}
                                {reservation.presente_recebido_em ? (
                                  <small>Recebido em {formatDate(reservation.presente_recebido_em)}</small>
                                ) : null}
                              </div>
                              <div className="admin-guest-gift-item__actions">
                                <AdminBadge
                                  variant={reservation.presente_recebido ? "success" : "warning"}
                                >
                                  {reservation.presente_recebido
                                    ? "Presente recebido"
                                    : "Envio pendente"}
                                </AdminBadge>
                                <AdminButton
                                  type="button"
                                  variant={reservation.presente_recebido ? "ghost" : "secondary"}
                                  disabled={updatingReceiptId === reservation.id}
                                  onClick={() =>
                                    void handleReceiptStatus(
                                      reservation,
                                      !reservation.presente_recebido,
                                    )
                                  }
                                >
                                  {updatingReceiptId === reservation.id
                                    ? "Atualizando..."
                                    : reservation.presente_recebido
                                      ? "Desfazer baixa"
                                      : "Dar baixa"}
                                </AdminButton>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>Nenhuma reserva relacionada.</p>
                      )}
                    </div>
                  </div>

                  {confirmacao.observacoes ? (
                    <div className="admin-confirmation-block">
                      <strong>Observações</strong>
                      <p>{confirmacao.observacoes}</p>
                    </div>
                  ) : null}

                  <div className="admin-confirmation-card-refined__actions admin-guest-card__actions">
                    <AdminButton
                      type="button"
                      variant="primary"
                      disabled={!phoneValid}
                      onClick={(event) => {
                        modalTriggerRef.current = event.currentTarget;
                        openMessageComposer({
                          nome: confirmacao.nome,
                          telefone: confirmacao.telefone || "",
                          confirmacao,
                          reservas: linkedReservations,
                        });
                      }}
                    >
                      {phoneValid ? "Enviar mensagem" : "Telefone inválido"}
                    </AdminButton>
                    <AdminButton
                      type="button"
                      variant="secondary"
                      onClick={(event) => {
                        modalTriggerRef.current = event.currentTarget;
                        openEditModal(confirmacao);
                      }}
                      disabled={loading}
                    >
                      Editar
                    </AdminButton>
                    <AdminButton
                      type="button"
                      variant="danger"
                      onClick={() => handleDelete(confirmacao)}
                      disabled={loading}
                    >
                      Excluir
                    </AdminButton>
                  </div>
                </AdminCard>
              );
            })}

            {visibleOrphans.map((reservation) => {
              const phone = reservationPhone(reservation);
              const phoneValid = isValidBrazilianPhone(phone);
              return (
                <AdminCard key={`orphan-${reservation.id}`} className="admin-guest-card admin-guest-card--orphan">
                  <div className="admin-confirmation-card-refined__badges">
                    <AdminBadge variant="warning">Reserva sem confirmação</AdminBadge>
                    <AdminBadge variant="neutral">Presente reservado</AdminBadge>
                    <AdminBadge
                      variant={reservation.presente_recebido ? "success" : "warning"}
                    >
                      {reservation.presente_recebido
                        ? "Presente recebido"
                        : "Envio pendente"}
                    </AdminBadge>
                  </div>
                  <h3 className="admin-confirmation-card-refined__title">{reservation.reservado_por}</h3>
                  <p className="admin-confirmation-card-refined__subtitle">{phone || "Telefone não informado"}</p>
                  <div className="admin-confirmation-block">
                    <strong>Reserva</strong>
                    <p>{reservation.presentes?.nome || `Presente #${reservation.presente_id}`}</p>
                    <p className="admin-reservation-value">
                      {formatCurrencyBR(reservation.presentes?.valor)}
                    </p>
                    <small>{formatDate(reservation.created_at)}</small>
                    {reservation.presente_recebido_em ? (
                      <small>Recebido em {formatDate(reservation.presente_recebido_em)}</small>
                    ) : null}
                  </div>
                  <div className="admin-orphan-link-box">
                    <AdminField
                      label="Relacionar à confirmação"
                      htmlFor={`reservation-link-${reservation.id}`}
                      hint="Use esta opção quando a reserva foi feita com apelido, sobrenome ou nome diferente do RSVP."
                    >
                      <select
                        id={`reservation-link-${reservation.id}`}
                        value={manualLinkSelections[reservation.id] || ""}
                        onChange={(event) =>
                          setManualLinkSelections((prev) => ({
                            ...prev,
                            [reservation.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Selecione um convidado</option>
                        {[...confirmationList]
                          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                          .map((confirmation) => (
                            <option key={confirmation.id} value={confirmation.id}>
                              {confirmation.nome}
                              {confirmation.telefone ? ` — ${confirmation.telefone}` : ""}
                            </option>
                          ))}
                      </select>
                    </AdminField>
                    <AdminButton
                      type="button"
                      variant="secondary"
                      disabled={
                        linkingReservationId === reservation.id ||
                        !manualLinkSelections[reservation.id]
                      }
                      onClick={() => handleManualLink(reservation)}
                    >
                      {linkingReservationId === reservation.id
                        ? "Relacionando..."
                        : "Relacionar reserva"}
                    </AdminButton>
                  </div>
                  <div className="admin-confirmation-card-refined__actions">
                    <AdminButton
                      type="button"
                      variant={reservation.presente_recebido ? "ghost" : "secondary"}
                      disabled={updatingReceiptId === reservation.id}
                      onClick={() =>
                        void handleReceiptStatus(
                          reservation,
                          !reservation.presente_recebido,
                        )
                      }
                    >
                      {updatingReceiptId === reservation.id
                        ? "Atualizando..."
                        : reservation.presente_recebido
                          ? "Desfazer baixa"
                          : "Dar baixa"}
                    </AdminButton>
                    <AdminButton
                      type="button"
                      variant="primary"
                      disabled={!phoneValid}
                      onClick={(event) => {
                        modalTriggerRef.current = event.currentTarget;
                        openMessageComposer({
                          nome: reservation.reservado_por,
                          telefone: phone,
                          confirmacao: null,
                          reservas: [reservation],
                        });
                      }}
                    >
                      {phoneValid ? "Pedir confirmação" : "Telefone inválido"}
                    </AdminButton>
                  </div>
                </AdminCard>
              );
            })}
          </div>
        )}
      </AdminCard>

      {isEditModalOpen ? (
        <div className="admin-modal-overlay" onClick={(event) => event.target === event.currentTarget && closeEditModal()}>
          <div className="admin-modal-card admin-modal-card--wide" role="dialog" aria-modal="true" aria-labelledby="confirmation-modal-title">
            <div className="admin-modal-header">
              <div className="admin-modal-title-wrap">
                <AdminBadge>Editar confirmação</AdminBadge>
                <h3 id="confirmation-modal-title" className="admin-modal-title">Atualizar confirmação</h3>
                <p className="admin-modal-subtitle">Ajuste os dados do convidado, presença e acompanhantes.</p>
              </div>
              <button type="button" className="admin-modal-close" onClick={closeEditModal} disabled={loading} aria-label="Fechar">×</button>
            </div>

            <form className="admin-form-stack" onSubmit={handleSubmit}>
              <AdminCard>
                <AdminCardHeader title="Dados principais" description="O telefone também é usado para relacionar reservas." />
                <div className="admin-form-grid">
                  <AdminField label="Nome" htmlFor="confirmacao_nome">
                    <input id="confirmacao_nome" type="text" autoComplete="name" value={form.nome} onChange={(event) => handleChange("nome", event.target.value)} />
                  </AdminField>
                  <AdminField label="Telefone" htmlFor="confirmacao_telefone">
                    <input id="confirmacao_telefone" type="tel" inputMode="tel" autoComplete="tel" value={form.telefone} onChange={(event) => handleChange("telefone", event.target.value)} placeholder="(84) 99999-9999" />
                  </AdminField>
                  <AdminField label="Quantidade de acompanhantes" htmlFor="confirmacao_acompanhantes" hint={`Limite atual: ${maxAcompanhantes}.`}>
                    <input id="confirmacao_acompanhantes" type="number" min={0} max={maxAcompanhantes} value={form.acompanhantes} onChange={(event) => handleChange("acompanhantes", event.target.value)} />
                  </AdminField>
                  <AdminField label="Presença" htmlFor="confirmacao_presenca">
                    <select id="confirmacao_presenca" value={form.presenca} onChange={(event) => handleChange("presenca", event.target.value)}>
                      <option value="">Selecione</option>
                      <option value="Sim, estarei presente">Sim, estarei presente</option>
                      <option value="Não poderei comparecer">Não poderei comparecer</option>
                    </select>
                  </AdminField>
                  {Number(form.acompanhantes || 0) > 0 ? (
                    <div className="admin-form-grid-full">
                      <AdminCard className="admin-inner-soft-card">
                        <AdminCardHeader title="Acompanhantes" description="Preencha o nome de cada acompanhante." />
                        <div className="admin-inline-stack">
                          {Array.from({ length: Number(form.acompanhantes || 0) }).map((_, index) => (
                            <AdminField key={`acompanhante-${index + 1}`} label={`Acompanhante ${index + 1}`}>
                              <input type="text" value={form.nomes_acompanhantes[index] || ""} onChange={(event) => handleAcompanhanteChange(index, event.target.value)} />
                            </AdminField>
                          ))}
                        </div>
                      </AdminCard>
                    </div>
                  ) : null}
                  <div className="admin-form-grid-full">
                    <AdminField label="Observações" htmlFor="confirmacao_observacoes">
                      <textarea id="confirmacao_observacoes" rows={4} value={form.observacoes} onChange={(event) => handleChange("observacoes", event.target.value)} />
                    </AdminField>
                  </div>
                </div>
              </AdminCard>
              <div className="admin-submit-bar">
                <div className="admin-submit-bar__feedback">{feedback ? <p className={`form-feedback form-feedback--${feedbackType}`}>{feedback}</p> : null}</div>
                <div className="admin-submit-bar__actions">
                  <AdminButton type="button" variant="secondary" onClick={closeEditModal} disabled={loading}>Cancelar</AdminButton>
                  <AdminButton type="submit" variant="primary" disabled={loading}>{loading ? "Salvando..." : "Salvar alterações"}</AdminButton>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isMessageModalOpen && messageTarget ? (
        <div className="admin-modal-overlay" onClick={(event) => event.target === event.currentTarget && closeMessageModal()}>
          <div className="admin-modal-card admin-modal-card--wide admin-message-modal" role="dialog" aria-modal="true" aria-labelledby="message-modal-title">
            <div className="admin-modal-header">
              <div className="admin-modal-title-wrap">
                <AdminBadge variant="success">WhatsApp</AdminBadge>
                <h3 id="message-modal-title" className="admin-modal-title">Preparar mensagem para {messageTarget.nome}</h3>
                <p className="admin-modal-subtitle">Escolha um modelo, edite livremente e adicione uma foto opcional.</p>
              </div>
              <button type="button" className="admin-modal-close" onClick={closeMessageModal} disabled={sharingPhoto} aria-label="Fechar">×</button>
            </div>

            <div className="admin-message-layout">
              <div className="admin-form-stack">
                <AdminField label="Modelo da mensagem" htmlFor="message_template">
                  <select id="message_template" value={messageTemplateKey} onChange={(event) => handleTemplateChange(event.target.value as MessageTemplateKey)}>
                    {MESSAGE_TEMPLATES.map((template) => (
                      <option key={template.key} value={template.key}>{template.label}</option>
                    ))}
                  </select>
                </AdminField>

                <p className="admin-message-template-help">{getMessageTemplate(messageTemplateKey).description}</p>

                <AdminField label="Mensagem" htmlFor="message_text" hint="Você pode alterar qualquer parte antes de abrir o WhatsApp.">
                  <textarea id="message_text" rows={12} value={messageText} onChange={(event) => setMessageText(event.target.value)} />
                </AdminField>

                <AdminField
                  label="Foto ou arte opcional"
                  htmlFor="message_photo"
                  hint="No celular, toque em “Enviar foto e mensagem” e escolha o WhatsApp. Em navegadores sem compartilhamento de arquivos, a foto será baixada para você anexar manualmente."
                >
                  <input
                    id="message_photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={sharingPhoto}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleMessagePhotoSelect(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </AdminField>

                {messagePhotoPreviewUrl && messagePhotoFile ? (
                  <div className="admin-message-photo-preview">
                    <Image
                      src={messagePhotoPreviewUrl}
                      alt="Foto opcional da mensagem"
                      width={640}
                      height={360}
                      unoptimized
                    />
                    <div className="admin-message-photo-actions">
                      <AdminButton type="button" variant="secondary" onClick={downloadMessagePhoto}>
                        Baixar foto
                      </AdminButton>
                      <AdminButton type="button" variant="ghost" onClick={removeMessagePhoto}>
                        Remover foto
                      </AdminButton>
                    </div>
                  </div>
                ) : null}

                {messageFeedback ? <p className="form-feedback form-feedback--success">{messageFeedback}</p> : null}
              </div>

              <aside className="admin-message-preview">
                <span>Prévia</span>
                <strong>{messageTarget.telefone}</strong>
                <div className="admin-message-preview__bubble">
                  {messageText.split("\n").map((line, index) => (
                    <p key={`${line}-${index}`}>{line || "\u00A0"}</p>
                  ))}
                  {messagePhotoFile ? <small>Foto anexada: {messagePhotoFile.name}</small> : null}
                </div>
              </aside>
            </div>

            <div className="admin-submit-bar">
              <div className="admin-submit-bar__feedback">
                <span className="admin-submit-bar__hint">A mensagem será aberta para revisão antes do envio.</span>
              </div>
              <div className="admin-submit-bar__actions">
                <AdminButton type="button" variant="secondary" onClick={() => void copyMessage()}>Copiar mensagem</AdminButton>
                {messagePhotoFile ? (
                  <AdminButton type="button" variant="secondary" onClick={openWhatsApp}>
                    Abrir só a mensagem
                  </AdminButton>
                ) : null}
                <AdminButton
                  type="button"
                  variant="primary"
                  onClick={() => void handlePrimaryMessageAction()}
                  disabled={sharingPhoto}
                >
                  {sharingPhoto
                    ? "Abrindo compartilhamento..."
                    : messagePhotoFile
                      ? "Enviar foto e mensagem"
                      : "Abrir no WhatsApp"}
                </AdminButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
