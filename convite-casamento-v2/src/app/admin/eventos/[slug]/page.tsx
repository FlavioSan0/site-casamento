import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  CreditCard,
  Images,
  Settings2,
  UsersRound,
} from "lucide-react";
import { getEventoBySlug } from "../../../../services/eventos";
import { getPresentesByEventoId } from "../../../../services/presentes";
import { getGaleriaByEventoId } from "../../../../services/galeria-evento";
import { createClient } from "../../../../lib/supabase/server";
import { AdminSectionHeader } from "../../../../components/admin/admin-section-header";
import { AdminBadge } from "../../../../components/admin/ui/admin-badge";
import { AdminButton } from "../../../../components/admin/ui/admin-button";
import { AdminCard, AdminCardHeader } from "../../../../components/admin/ui/admin-card";

async function getConfirmacoesByEventoId(eventoId: number) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("confirmacoes")
    .select("*")
    .eq("evento_id", eventoId);

  if (error) {
    console.error("Erro ao buscar confirmações:", error.message);
    return [];
  }

  return data || [];
}

type AdminEventoDashboardPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatDateBR(dateString: string | null) {
  if (!dateString) return "Não definida";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Não definida";
  return date.toLocaleDateString("pt-BR");
}

export default async function AdminEventoDashboardPage({
  params,
}: AdminEventoDashboardPageProps) {
  const { slug } = await params;
  const evento = await getEventoBySlug(slug);

  if (!evento) {
    notFound();
  }

  const [presentes, confirmacoes, galeria] = await Promise.all([
    getPresentesByEventoId(evento.id),
    getConfirmacoesByEventoId(evento.id),
    getGaleriaByEventoId(evento.id),
  ]);

  const confirmados = confirmacoes.filter(
    (item) => item.presenca === "Sim, estarei presente",
  ).length;

  const ausentes = confirmacoes.filter(
    (item) => item.presenca === "Não poderei comparecer",
  ).length;

  const totalAcompanhantes = confirmacoes.reduce(
    (acc, item) => acc + Number(item.acompanhantes || 0),
    0,
  );

  const totalConvidados = confirmacoes.reduce(
    (acc, item) => acc + 1 + Number(item.acompanhantes || 0),
    0,
  );

  const totalReservas = presentes.reduce(
    (acc, item) => acc + Number(item.quantidade_reservada || 0),
    0,
  );

  const imagensDestaque = galeria.filter((item) => item.destaque).length;

  return (
    <div className="admin-page-stack">
      <section className="event-section">
        <AdminSectionHeader
          badge="Painel"
          title="Visão geral do evento"
          description="Acompanhe os indicadores principais e acesse rapidamente os módulos mais importantes da operação."
        />

        <div className="admin-dashboard-hero">
          <div className="admin-dashboard-hero__content">
            <AdminBadge variant="neutral">Resumo operacional</AdminBadge>

            <h2 className="admin-dashboard-hero__title">{evento.nome_evento}</h2>

            <p className="admin-dashboard-hero__text">
              Gerencie confirmações, presentes, galeria e configurações do evento
              em um único painel organizado por seções.
            </p>

            <div className="admin-dashboard-hero__meta">
              <div className="admin-dashboard-hero__meta-item">
                <CalendarDays className="admin-dashboard-hero__meta-icon" />
                <span>Data: {formatDateBR(evento.data_evento)}</span>
              </div>

              <div className="admin-dashboard-hero__meta-item">
                <CalendarDays className="admin-dashboard-hero__meta-icon" />
                <span>Horário: {evento.horario_evento || "Não definido"}</span>
              </div>
            </div>
          </div>

          <div className="admin-dashboard-hero__actions">
          <Link href={`/evento/${slug}`} target="_blank">
            <AdminButton variant="secondary">Ver site público</AdminButton>
          </Link>

          <Link href={`/admin/eventos/${slug}/configuracoes`}>
            <AdminButton variant="primary">Abrir configurações</AdminButton>
          </Link>
        </div>
        </div>
      </section>

      <section className="event-section">
        <AdminCard>
          <AdminCardHeader
            title="Indicadores principais"
            description="Leitura rápida dos números mais importantes do evento."
          />

          <div className="admin-overview-metrics admin-overview-metrics--dashboard">
            <div className="admin-metric-card admin-metric-card--highlight">
              <span className="admin-metric-label">Confirmações</span>
              <strong className="admin-metric-value">{confirmacoes.length}</strong>
              <p className="admin-metric-text">
                Total de respostas registradas no RSVP.
              </p>
            </div>

            <div className="admin-metric-card">
              <span className="admin-metric-label">Total de convidados</span>
              <strong className="admin-metric-value">{totalConvidados}</strong>
              <p className="admin-metric-text">
                Soma de convidados principais com acompanhantes.
              </p>
            </div>

            <div className="admin-metric-card">
              <span className="admin-metric-label">Confirmados</span>
              <strong className="admin-metric-value">{confirmados}</strong>
              <p className="admin-metric-text">
                Pessoas que marcaram presença no evento.
              </p>
            </div>

            <div className="admin-metric-card">
              <span className="admin-metric-label">Ausências</span>
              <strong className="admin-metric-value">{ausentes}</strong>
              <p className="admin-metric-text">
                Respostas marcadas como não comparecimento.
              </p>
            </div>

            <div className="admin-metric-card">
              <span className="admin-metric-label">Acompanhantes</span>
              <strong className="admin-metric-value">{totalAcompanhantes}</strong>
              <p className="admin-metric-text">
                Total de acompanhantes vinculados às confirmações.
              </p>
            </div>

            <div className="admin-metric-card">
              <span className="admin-metric-label">Reservas</span>
              <strong className="admin-metric-value">{totalReservas}</strong>
              <p className="admin-metric-text">
                Soma das reservas registradas nos presentes.
              </p>
            </div>
          </div>
        </AdminCard>
      </section>

      <section className="event-section">
        <AdminCard>
          <AdminCardHeader
            title="Acessos rápidos"
            description="Entre direto nos módulos principais do painel."
          />

          <div className="admin-dashboard-shortcuts">
            <article className="admin-shortcut-card">
              <div className="admin-shortcut-card__icon">
                <Settings2 className="admin-shortcut-card__icon-svg" />
              </div>

              <div className="admin-shortcut-card__content">
                <span className="admin-shortcut-card__eyebrow">Configurações</span>
                <h3 className="admin-shortcut-card__title">Evento</h3>
                <p className="admin-shortcut-card__text">
                  Dados principais, RSVP, dress code, PIX e ajustes gerais do evento.
                </p>
              </div>

              <Link href={`/admin/eventos/${slug}/configuracoes`}>
                <AdminButton variant="primary" className="admin-shortcut-card__button">
                  Abrir configurações
                </AdminButton>
              </Link>
            </article>

            <article className="admin-shortcut-card">
              <div className="admin-shortcut-card__icon">
                <UsersRound className="admin-shortcut-card__icon-svg" />
              </div>

              <div className="admin-shortcut-card__content">
                <span className="admin-shortcut-card__eyebrow">Convidados</span>
                <h3 className="admin-shortcut-card__title">{confirmacoes.length}</h3>
                <p className="admin-shortcut-card__text">
                  Gerencie confirmações, acompanhantes e observações dos convidados.
                </p>
              </div>

              <Link href={`/admin/eventos/${slug}/convidados`}>
                <AdminButton variant="primary" className="admin-shortcut-card__button">
                  Ver convidados
                </AdminButton>
              </Link>
            </article>

            <article className="admin-shortcut-card">
              <div className="admin-shortcut-card__icon">
                <CreditCard className="admin-shortcut-card__icon-svg" />
              </div>

              <div className="admin-shortcut-card__content">
                <span className="admin-shortcut-card__eyebrow">Financeiro</span>
                <h3 className="admin-shortcut-card__title">{presentes.length}</h3>
                <p className="admin-shortcut-card__text">
                  Organize presentes, cotas e reservas registradas no evento.
                </p>
              </div>

              <Link href={`/admin/eventos/${slug}/financeiro`}>
                <AdminButton variant="primary" className="admin-shortcut-card__button">
                  Ir para financeiro
                </AdminButton>
              </Link>
            </article>

            <article className="admin-shortcut-card">
              <div className="admin-shortcut-card__icon">
                <Images className="admin-shortcut-card__icon-svg" />
              </div>

              <div className="admin-shortcut-card__content">
                <span className="admin-shortcut-card__eyebrow">Layout</span>
                <h3 className="admin-shortcut-card__title">{galeria.length}</h3>
                <p className="admin-shortcut-card__text">
                  Gerencie galeria, imagem destaque e materiais visuais do site.
                </p>
              </div>

              <Link href={`/admin/eventos/${slug}/layout`}>
                <AdminButton variant="primary" className="admin-shortcut-card__button">
                  Ajustar layout
                </AdminButton>
              </Link>
            </article>
          </div>
        </AdminCard>
      </section>

      <section className="event-section">
        <AdminCard>
          <AdminCardHeader
            title="Resumo rápido"
            description="Panorama geral do estado atual do evento."
          />

          <div className="admin-summary-grid">
            <div className="admin-summary-item">
              <span className="admin-summary-item__label">Presença confirmada</span>
              <strong className="admin-summary-item__value">{confirmados}</strong>
            </div>

            <div className="admin-summary-item">
              <span className="admin-summary-item__label">Imagens na galeria</span>
              <strong className="admin-summary-item__value">{galeria.length}</strong>
            </div>

            <div className="admin-summary-item">
              <span className="admin-summary-item__label">Imagem destaque</span>
              <strong className="admin-summary-item__value">{imagensDestaque}</strong>
            </div>

            <div className="admin-summary-item">
              <span className="admin-summary-item__label">Presentes cadastrados</span>
              <strong className="admin-summary-item__value">{presentes.length}</strong>
            </div>
          </div>
        </AdminCard>
      </section>
    </div>
  );
}