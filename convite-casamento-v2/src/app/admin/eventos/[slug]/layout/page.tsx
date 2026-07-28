import { notFound } from "next/navigation";
import { getEventoBySlug } from "../../../../../services/eventos";
import { getGaleriaByEventoId } from "../../../../../services/galeria-evento";
import { getConfiguracaoEvento } from "../../../../../services/configuracoes-evento";
import { getHistoriaMomentosByEventoId } from "../../../../../services/historia-momentos";
import { LayoutSettingsPanel } from "../../../../../components/admin/layout-settings-panel";
import { GalleryManager } from "../../../../../components/admin/gallery-manager";
import { HistoryManager } from "../../../../../components/admin/history-manager";
import { AdminCard, AdminCardHeader } from "../../../../../components/admin/ui/admin-card";
import { AdminBadge } from "../../../../../components/admin/ui/admin-badge";

type AdminLayoutPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function getHeroTypeLabel(type: string | null | undefined) {
  if (type === "image") return "Imagem";
  if (type === "video") return "Vídeo";
  return "Sem mídia";
}

export default async function AdminLayoutPage({
  params,
}: AdminLayoutPageProps) {
  const { slug } = await params;
  const evento = await getEventoBySlug(slug);

  if (!evento) {
    notFound();
  }

  const [galeria, configuracoes, historia] = await Promise.all([
    getGaleriaByEventoId(evento.id),
    getConfiguracaoEvento(evento.id),
    getHistoriaMomentosByEventoId(evento.id),
  ]);

  const modeloAtual = configuracoes?.modelo_layout || "classic";
  const heroType = configuracoes?.hero_background_type || "none";
  const heroAtivo =
    heroType !== "none" && !!configuracoes?.hero_background_url?.trim();

  return (
    <div className="admin-page-stack">
      <AdminCard>
        <AdminCardHeader
          title="Resultado esperado"
          description="Resumo rápido da direção visual atual do evento."
        />

        <div className="admin-layout-result-grid">
          <div className="admin-layout-result-card">
            <span className="admin-layout-result-card__label">Modelo</span>
            <strong className="admin-layout-result-card__value">
              {modeloAtual}
            </strong>
          </div>

          <div className="admin-layout-result-card">
            <span className="admin-layout-result-card__label">Hero</span>
            <strong className="admin-layout-result-card__value">
              {getHeroTypeLabel(heroType)}
            </strong>
            {heroAtivo ? (
              <AdminBadge variant="success">Ativo</AdminBadge>
            ) : (
              <AdminBadge variant="neutral">Sem mídia</AdminBadge>
            )}
          </div>

          <div className="admin-layout-result-card">
            <span className="admin-layout-result-card__label">Galeria</span>
            <strong className="admin-layout-result-card__value">
              {galeria.length}
            </strong>
            <span className="admin-layout-result-card__helper">
              imagem(ns) cadastrada(s)
            </span>
          </div>

          <div className="admin-layout-result-card">
            <span className="admin-layout-result-card__label">História</span>
            <strong className="admin-layout-result-card__value">
              {historia.length}
            </strong>
            <span className="admin-layout-result-card__helper">
              momento(s) cadastrado(s)
            </span>
          </div>

          <div className="admin-layout-result-card">
            <span className="admin-layout-result-card__label">Paleta</span>
            <div className="admin-layout-result-card__swatches">
              <span style={{ background: configuracoes?.cor_primaria || "#800000" }} />
              <span style={{ background: configuracoes?.cor_secundaria || "#08265e" }} />
              <span style={{ background: configuracoes?.cor_acento || "#c9a227" }} />
              <span style={{ background: configuracoes?.cor_fundo || "#fffaf8" }} />
              <span style={{ background: configuracoes?.cor_superficie || "#ffffff" }} />
            </div>
          </div>
        </div>
      </AdminCard>

      <LayoutSettingsPanel
        eventoId={evento.id}
        configuracoes={configuracoes}
      />

      <HistoryManager
        eventoId={evento.id}
        configuracoes={configuracoes}
        momentos={historia}
      />

      <GalleryManager eventoId={evento.id} imagens={galeria} />
    </div>
  );
}